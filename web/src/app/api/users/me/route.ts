import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
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
