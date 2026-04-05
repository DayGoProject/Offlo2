import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── GET /api/badges — 내 배지 목록 조회 ───────────────────── */
// 배지는 시스템(게이미피케이션 로직)이 자동 부여한다. 클라이언트 생성 없음.

export async function GET(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const badges = await prisma.badge.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: "desc" },
    });

    return Response.json({ badges });
  } catch (e) {
    return handleApiError(e);
  }
}
