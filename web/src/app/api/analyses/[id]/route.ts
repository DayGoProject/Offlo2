import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── GET /api/analyses/[id] — 특정 분석 조회 ───────────────── */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);
    const { id } = await params;

    if (!id || id.length > 128) throw apiError("유효하지 않은 분석 ID입니다.", 400);

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const analysis = await prisma.analysis.findUnique({ where: { id } });
    if (!analysis) throw apiError("분석 결과를 찾을 수 없습니다.", 404);

    // 본인 데이터만 반환 — 타인의 분석 ID를 직접 지정해도 접근 불가
    if (analysis.userId !== user.id) throw apiError("접근 권한이 없습니다.", 403);

    return Response.json({ analysis });
  } catch (e) {
    return handleApiError(e);
  }
}
