import { verifyIdToken, handleApiError, getAdminFirestore } from "@/lib/firebase-admin";

/* ── POST /api/notifications/read-all — 전체 읽음 처리 ─────────
   안읽음 알림을 배치로 read: true 갱신.
   ────────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);
    const db = getAdminFirestore();

    const snap = await db
      .collection(`users/${uid}/notifications`)
      .where("read", "==", false)
      .get();

    if (snap.empty) return Response.json({ ok: true, updated: 0 });

    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();

    return Response.json({ ok: true, updated: snap.size });
  } catch (e) {
    return handleApiError(e);
  }
}
