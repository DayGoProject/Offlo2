import { verifyIdToken, handleApiError, getAdminFirestore } from "@/lib/firebase-admin";

/* ── GET /api/notifications — 내 알림 목록 조회 ────────────────
   최근 50건(createdAt desc) + 안읽음 수 반환.
   ────────────────────────────────────────────────────────── */

export async function GET(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);
    const db = getAdminFirestore();

    const snap = await db
      .collection(`users/${uid}/notifications`)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const unreadCount = notifications.filter((n) => (n as { read?: boolean }).read !== true).length;

    return Response.json({ notifications, unreadCount });
  } catch (e) {
    return handleApiError(e);
  }
}
