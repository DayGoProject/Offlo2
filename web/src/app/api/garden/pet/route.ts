import { verifyIdToken, apiError, handleApiError, getAdminFirestore } from "@/lib/firebase-admin";
import { kstDateKey } from "@/lib/kst";
import {
  PET_DAILY_CAP,
  applyPetTaps,
  getAffectionLevel,
  nextAffectionLevel,
  normalizePet,
} from "@/lib/garden-utils";

/* ── POST /api/garden/pet — 쓰다듬기 기록 ─────────────────────
   count: 이번에 묶어 보내는 쓰다듬기 횟수 (1~PET_DAILY_CAP, 생략하면 1)

   - 하루(KST)에 PET_DAILY_CAP번까지만 인정한다. 넘은 탭은 에러가 아니라 accepted 0 (또는 일부)으로 돌려준다 —
     앱·웹은 화면 효과만 내고 계속 쓰다듬을 수 있다.
   - 친밀도 = 누적 인정 횟수(total). `users/{uid}/garden/animal`의 `pet` 필드에 둔다.
     동물 변경(reset)은 animal 문서를 통째로 덮어쓰므로 쓰다듬기 기록도 함께 0부터 다시 시작한다.
   - 트랜잭션으로 읽고 쓴다 — 두 기기에서 동시에 눌러도 상한을 넘기지 못한다.
   - 두 번 보내면 두 번 반영된다(멱등 아님) — 클라이언트는 재시도하지 않는다.
   ────────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    const { count } = body as { count?: unknown };
    const n = count === undefined ? 1 : count;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > PET_DAILY_CAP) {
      throw apiError(`count는 1~${PET_DAILY_CAP} 사이의 정수여야 합니다.`, 400);
    }

    const db = getAdminFirestore();
    const ref = db.doc(`users/${uid}/garden/animal`);
    const today = kstDateKey();

    const { next, accepted } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data()! : null;
      if (!data?.type) throw apiError("먼저 함께할 동물을 골라 주세요.", 409);

      const result = applyPetTaps(normalizePet(data.pet), today, n);
      // 하나도 인정되지 않았으면(오늘 상한이 찼으면) 쓰지 않는다
      if (result.accepted > 0) {
        tx.set(ref, { pet: result.next, lastUpdated: new Date().toISOString() }, { merge: true });
      }
      return result;
    });

    const level = getAffectionLevel(next.total);
    const upcoming = nextAffectionLevel(level);

    return Response.json({
      ok: true,
      accepted,
      date: next.date,
      today: next.today,
      cap: PET_DAILY_CAP,
      total: next.total,
      level: { level: level.level, name: level.name },
      nextLevel: upcoming ? { level: upcoming.level, name: upcoming.name, minTotal: upcoming.minTotal } : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
