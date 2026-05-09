import { verifyIdToken, apiError, handleApiError, getAdminFirestore } from "@/lib/firebase-admin";

const VALID_TYPES = ["cat", "dog", "rabbit"] as const;
type AnimalTypeId = typeof VALID_TYPES[number];

/* ── POST /api/garden/animal — 동물 선택 / 변경 ───────────────
   typeId: 선택할 동물 종류
   reset:  true → 연속 기록·마지막 분석일 초기화 (동물 변경 시)
           false → type만 업데이트 (최초 선택 시)
   ────────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    const { typeId, reset } = body as { typeId?: unknown; reset?: unknown };

    if (!VALID_TYPES.includes(typeId as AnimalTypeId)) {
      throw apiError("typeId는 'cat', 'dog', 'rabbit' 중 하나여야 합니다.", 400);
    }

    const db = getAdminFirestore();
    const ref = db.doc(`users/${uid}/garden/animal`);

    if (reset === true) {
      /* 동물 변경: 연속 기록 완전 초기화 — 문서 전체 덮어쓰기 */
      await ref.set({
        type: typeId as AnimalTypeId,
        streak: 0,
        lastAnalysisDate: null,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      /* 최초 선택: type만 설정, 기존 데이터 유지 */
      await ref.set(
        { type: typeId as AnimalTypeId, lastUpdated: new Date().toISOString() },
        { merge: true }
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
