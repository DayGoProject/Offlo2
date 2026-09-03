import { apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { requireUser, requireId } from "@/lib/social";

/* ── DELETE /api/comments/[id] — 내 댓글 삭제 ──────────────── */

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { userId } = await requireUser(req);
    const id = requireId((await params).id, "댓글");

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true, postId: true },
    });
    if (!comment) throw apiError("댓글을 찾을 수 없습니다.", 404);
    if (comment.userId !== userId) throw apiError("접근 권한이 없습니다.", 403);

    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id } });
      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });
    });

    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
