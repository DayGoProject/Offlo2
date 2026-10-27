import { apiError, getAdminFirestore } from "@/lib/firebase-admin";
import { kstDateKey } from "@/lib/kst";

/**
 * 사용자별 AI 호출 횟수 제한 (하루 · KST) — **Gemini를 부르기 전에** 센다.
 *
 * `lib/analysis-limits.ts`는 "저장된 분석"으로 일간 1회 · 주간 1회를 막는다. 하지만 AI를 부르고 **저장하지 않으면** 그 확인에 걸리지 않아
 * 한 사용자가 토큰 하나로 Gemini를 끝없이 부를 수 있었고(비용), 채팅(`/api/ai/chat`)에는 아예 횟수 제한이 없었다.
 * 이 파일이 그 구멍을 닫는다 — 앱을 테스터에게 배포하기 전에(M9) 필요한 안전장치다.
 *
 * - 상한은 **정상 사용을 막지 않는 선**이다: 일간 분석은 하루 1번 성공이 목표지만 AI 실패 · 사진 재선택 · 두 기기를 감안해 여유를 둔다.
 *   (일간 · 주간 "성공 1회"는 여전히 `analysis-limits.ts`가 409로 막는다 — 이 상한은 그 앞단의 비용 방어선이다)
 * - **횟수는 호출을 시도하는 순간 센다** (Gemini가 실패해도 센다). 센 다음 부르므로 동시에 여러 요청이 와도 상한을 넘기지 못한다 (트랜잭션).
 * - 저장은 Firestore `users/{uid}/aiUsage/{KST 날짜}` — 서버(Admin SDK)만 쓴다. 이 하위 컬렉션은 `firestore.rules`의 "그 외 모든 접근 차단"에 걸려 클라이언트가
 *   읽지도 쓰지도 못한다 (자기 횟수를 지울 수 없다). 날짜가 문서 id라 하루가 지나면 새 문서에서 0부터 센다 (옛 문서는 그대로 쌓이니 필요하면 나중에 TTL로 정리).
 */

export type AiKind = "analyze" | "weekly" | "chat";

/** 하루(KST) 호출 상한 */
export const AI_DAILY_LIMITS: Record<AiKind, number> = {
  analyze: 6,
  weekly: 3,
  chat: 120,
};

const LIMIT_MESSAGES: Record<AiKind, string> = {
  analyze: "오늘 AI 분석 요청 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.",
  weekly: "오늘 주간 분석 요청 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.",
  chat: "오늘 AI 코치와 나눌 수 있는 대화 횟수를 모두 사용했습니다. 내일 다시 이야기해요.",
};

/** 오늘(KST)의 사용 문서 경로 */
export function aiUsagePath(uid: string, now: number = Date.now()): string {
  return `users/${uid}/aiUsage/${kstDateKey(now)}`;
}

/**
 * AI를 한 번 부르기 전에 호출한다 — 상한이면 429를 던지고, 아니면 횟수를 하나 올린다 (읽고 올리는 것이 한 트랜잭션).
 * 상한은 이 함수를 부르는 위치가 정한다: 입력 검증 · "이미 분석했다"(409) 확인 **뒤**, Gemini 호출 **앞**.
 */
export async function consumeAiCall(uid: string, kind: AiKind, now: number = Date.now()): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.doc(aiUsagePath(uid, now));
  const limit = AI_DAILY_LIMITS[kind];
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const raw = snap.data()?.[kind];
    const used = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    if (used >= limit) throw apiError(LIMIT_MESSAGES[kind], 429);
    tx.set(ref, { [kind]: used + 1, updatedAt: new Date(now).toISOString() }, { merge: true });
  });
}
