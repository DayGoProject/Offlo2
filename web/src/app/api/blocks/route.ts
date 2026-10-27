import { apiError, handleApiError } from "@/lib/firebase-admin";
import { blockAuthorOf, listBlocks, requireTarget } from "@/lib/moderation";
import { requireUser } from "@/lib/social";

/* ── GET /api/blocks — 내가 차단한 사용자 (최근 차단 순) ─────── */

export async function GET(req: Request): Promise<Response> {
  try {
    const { uid } = await requireUser(req);
    return Response.json({ blocks: await listBlocks(uid) });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── POST /api/blocks — 글 · 댓글의 작성자를 차단 (M9 · Play UGC 정책) ──
   body: { targetType: "post" | "comment", targetId }  — 작성자 id를 클라이언트에 내려주지 않으려고 글 · 댓글로 가리킨다
   반환: { block: { userId, name, createdAt } }  (이미 차단했으면 그대로 · 멱등) · 나 자신은 차단할 수 없다
   차단하면 그 사용자의 글 · 댓글 · 랭킹 줄이 나에게 보이지 않는다 (상대에게 알리지 않는다)
   ─────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const { uid, userId } = await requireUser(req);
    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });
    const { targetType, targetId } = requireTarget(body as Record<string, unknown>);
    const block = await blockAuthorOf(uid, userId, targetType, targetId);
    return Response.json({ block }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
