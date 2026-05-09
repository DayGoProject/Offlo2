import * as admin from "firebase-admin";
import { verifyIdToken, apiError, handleApiError, getAdminFirestore } from "@/lib/firebase-admin";

/* ── POST /api/garden/plant-exp — 식물 경험치 적립 ────────────
   클라이언트(정원 페이지, Chrome 확장)가 직접 Firestore를 쓰지 않고
   이 엔드포인트를 통해 Admin SDK로 원자적 increment를 수행한다.
   ────────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    const { minutes } = body as { minutes?: unknown };

    if (
      typeof minutes !== "number" ||
      !Number.isInteger(minutes) ||
      minutes <= 0 ||
      minutes > 1440
    ) {
      throw apiError("minutes는 1~1440 사이의 정수여야 합니다.", 400);
    }

    const db = getAdminFirestore();
    await db.doc(`users/${uid}/garden/plant`).set(
      {
        totalDetoxMinutes: admin.firestore.FieldValue.increment(minutes),
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );

    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
