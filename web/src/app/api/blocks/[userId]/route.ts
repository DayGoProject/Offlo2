import { handleApiError } from "@/lib/firebase-admin";
import { unblockUser } from "@/lib/moderation";
import { requireId, requireUser } from "@/lib/social";

/* ── DELETE /api/blocks/[userId] — 차단 해제 ───────────────────
   내 차단 목록에서 뺀다 (없어도 성공 · 멱등). 204 */

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
): Promise<Response> {
  try {
    const { uid } = await requireUser(req);
    const blockedUserId = requireId((await params).userId, "사용자");
    await unblockUser(uid, blockedUserId);
    return new Response(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}
