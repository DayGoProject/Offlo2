import { apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { requireUser, requireId } from "@/lib/social";

/* ── DELETE /api/posts/[id] — 내 글 삭제 ───────────────────── */
// 댓글·좋아요는 onDelete: Cascade로 함께 정리된다.

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { userId } = await requireUser(req);
    const id = requireId((await params).id, "게시글");

    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true, type: true, badgeName: true },
    });
    if (!post) throw apiError("게시글을 찾을 수 없습니다.", 404);
    if (post.userId !== userId) throw apiError("접근 권한이 없습니다.", 403);

    await prisma.$transaction(async (tx) => {
      await tx.post.delete({ where: { id } });
      // 배지 글을 지우면 다시 공유할 수 있도록 shared 플래그를 되돌린다
      if (post.type === "badge" && post.badgeName) {
        await tx.badge.updateMany({
          where: { userId, name: post.badgeName },
          data: { shared: false },
        });
      }
    });

    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
