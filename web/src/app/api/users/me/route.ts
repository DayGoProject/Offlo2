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

/* ── PATCH /api/users/me — 이름 변경 ───────────────────────── */
// 커뮤니티 피드·랭킹에 노출되는 이름은 Supabase `User.name`이다. 클라이언트 Firebase 프로필(`updateProfile`)만 고치면 서버 이름은
// 그대로라 글·댓글·랭킹에 옛 이름이 남는다 — 그래서 `POST /api/users`(이미 있으면 변경 없음)와 따로, 이름만 고치는 전용 라우트를 둔다.
// 같은 값을 다시 보내도 결과가 같다(멱등).

export async function PATCH(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    const { name } = body as { name?: unknown };
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (trimmed.length === 0 || trimmed.length > 100) throw apiError("이름은 1~100자여야 합니다.", 400);

    const existing = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!existing) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const user = await prisma.user.update({
      where: { uid },
      data: { name: trimmed },
      select: { id: true, uid: true, email: true, name: true, premium: true, createdAt: true },
    });

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
