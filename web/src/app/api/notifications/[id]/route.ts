import { verifyIdToken, apiError, handleApiError, getAdminFirestore } from "@/lib/firebase-admin";

/* ── PATCH /api/notifications/[id] — 단건 읽음 처리 ────────────
   body: { read: true }
   ────────────────────────────────────────────────────────── */

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);
    const { id } = await params;

    if (!id || id.length > 128) throw apiError("유효하지 않은 알림 ID입니다.", 400);

    const db = getAdminFirestore();
    const ref = db.doc(`users/${uid}/notifications/${id}`);
    const snap = await ref.get();
    if (!snap.exists) throw apiError("알림을 찾을 수 없습니다.", 404);

    await ref.update({ read: true });
    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
