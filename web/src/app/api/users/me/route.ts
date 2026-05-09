import * as admin from "firebase-admin";
import { verifyIdToken, apiError, handleApiError, getAdminFirestore } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── GET /api/users/me — 내 프로필 조회 ────────────────────── */

export async function GET(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const user = await prisma.user.findUnique({
      where: { uid },
      select: { id: true, uid: true, email: true, name: true, premium: true, createdAt: true },
    });

    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    return Response.json({ user });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── DELETE /api/users/me — 회원 탈퇴 ─────────────────────── */

export async function DELETE(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    /* 1. Supabase 유저 + 연관 데이터 삭제 (cascade) */
    await prisma.user.deleteMany({ where: { uid } });

    /* 2. Firestore garden 데이터 삭제 */
    const db = getAdminFirestore();
    const gardenRef = db.collection(`users/${uid}/garden`);
    const docs = await gardenRef.listDocuments();
    await Promise.all(docs.map((d) => d.delete()));

    /* 3. Firebase Auth 계정 삭제 */
    await admin.auth().deleteUser(uid);

    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
