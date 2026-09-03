import { apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import {
  requireUser, requireText, parseLimit,
  MAX_POST_LENGTH, POST_TYPES, type PostType,
} from "@/lib/social";

/* ── GET /api/posts — 커뮤니티 피드 (cursor 페이지네이션) ──── */

export async function GET(req: Request): Promise<Response> {
  try {
    const { userId } = await requireUser(req);

    const url = new URL(req.url);
    const limit = parseLimit(url);
    const cursor = url.searchParams.get("cursor");

    // limit + 1개를 읽어 다음 페이지 존재 여부를 판단한다
    const rows = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      // id를 2차 정렬 키로 둬야 createdAt이 같은 글에서도 커서가 안정적이다
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true, type: true, content: true, badgeName: true,
        likeCount: true, commentCount: true, createdAt: true, userId: true,
        user: { select: { name: true } },
        // 내가 누른 좋아요만 조회 — 전체 좋아요를 읽지 않는다
        likes: { where: { userId }, select: { id: true }, take: 1 },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return Response.json({
      posts: page.map((p) => ({
        id: p.id,
        type: p.type,
        content: p.content,
        badgeName: p.badgeName,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
        authorName: p.user.name,
        isMine: p.userId === userId,
        liked: p.likes.length > 0,
      })),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── POST /api/posts — 글 작성 (일반 글 · 배지 자랑) ───────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId } = await requireUser(req);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });
    const { type, content, badgeId } = body as Record<string, unknown>;

    const postType: PostType =
      type === undefined ? "text" : (type as PostType);
    if (!POST_TYPES.includes(postType))
      throw apiError("지원하지 않는 게시글 유형입니다.", 400);

    /* 일반 글 */
    if (postType === "text") {
      const text = requireText(content, MAX_POST_LENGTH, "내용");
      const post = await prisma.post.create({
        data: { userId, type: "text", content: text },
      });
      return Response.json({ post }, { status: 201 });
    }

    /* 배지 자랑 — 배지명은 클라이언트를 신뢰하지 않고 DB에서 다시 읽는다 */
    if (typeof badgeId !== "string" || badgeId.length === 0 || badgeId.length > 128)
      throw apiError("badgeId가 필요합니다.", 400);

    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      select: { id: true, userId: true, name: true, shared: true },
    });
    if (!badge) throw apiError("배지를 찾을 수 없습니다.", 404);
    if (badge.userId !== userId) throw apiError("본인의 배지만 공유할 수 있습니다.", 403);
    if (badge.shared) throw apiError("이미 공유한 배지입니다.", 409);

    // 배지 글의 한마디는 선택 사항 (공백만 입력해도 빈 값으로 처리)
    const message =
      typeof content === "string" && content.trim().length > 0
        ? requireText(content, MAX_POST_LENGTH, "내용")
        : "";

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: { userId, type: "badge", content: message, badgeName: badge.name },
      });
      await tx.badge.update({ where: { id: badge.id }, data: { shared: true } });
      return created;
    });

    return Response.json({ post }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
