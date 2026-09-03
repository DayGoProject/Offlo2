import { apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { notifyPostComment } from "@/lib/notifications";
import { requireUser, requireId, requireText, MAX_COMMENT_LENGTH } from "@/lib/social";

/* ── GET /api/posts/[id]/comments — 댓글 목록 (오래된 순) ──── */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { userId } = await requireUser(req);
    const postId = requireId((await params).id, "게시글");

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true, content: true, createdAt: true, userId: true,
        user: { select: { name: true } },
      },
    });

    return Response.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        authorName: c.user.name,
        isMine: c.userId === userId,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── POST /api/posts/[id]/comments — 댓글 작성 ─────────────── */

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { userId, name } = await requireUser(req);
    const postId = requireId((await params).id, "게시글");

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });
    const content = requireText((body as Record<string, unknown>).content, MAX_COMMENT_LENGTH, "댓글");

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, user: { select: { uid: true } } },
    });
    if (!post) throw apiError("게시글을 찾을 수 없습니다.", 404);

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { postId, userId, content },
        select: { id: true, content: true, createdAt: true },
      });
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return created;
    });

    // 글쓴이에게 알림 (본인 글에 본인이 단 댓글은 제외). 실패해도 응답에 영향 없음.
    if (post.userId !== userId) {
      notifyPostComment(post.user.uid, name, postId).catch(console.error);
    }

    return Response.json(
      { comment: { ...comment, authorName: name, isMine: true } },
      { status: 201 }
    );
  } catch (e) {
    return handleApiError(e);
  }
}
