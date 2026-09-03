import { apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { requireUser, requireId } from "@/lib/social";

/* ── POST /api/posts/[id]/like — 좋아요 토글 ───────────────── */
// 좋아요 행 생성/삭제와 likeCount 증감을 한 트랜잭션으로 묶는다.
// 알림은 보내지 않는다 (도배 방지 — 알림은 댓글에만).

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { userId } = await requireUser(req);
    const postId = requireId((await params).id, "게시글");

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw apiError("게시글을 찾을 수 없습니다.", 404);

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.postLike.delete({ where: { id: existing.id } });
        return tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        });
      }
      await tx.postLike.create({ data: { postId, userId } });
      return tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
    });

    return Response.json({ liked: !existing, likeCount: updated.likeCount });
  } catch (e) {
    return handleApiError(e);
  }
}
