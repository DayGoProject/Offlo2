import { apiError, handleApiError } from "@/lib/firebase-admin";
import { reportContent, requireTarget } from "@/lib/moderation";
import { requireUser } from "@/lib/social";

/* ── POST /api/reports — 글 · 댓글 신고 (M9 · Play UGC 정책) ───
   body: { targetType: "post" | "comment", targetId, reason: "spam" | "abuse" | "sexual" | "privacy" | "other", detail?: string }
   반환: { ok: true, alreadyReported, hidden }
   - 신고한 글 · 댓글은 그 사람에게 곧바로 숨겨진다 · 서로 다른 신고자 3명이면 모두에게서 숨겨진다 (작성자 본인 제외)
   - 같은 대상을 다시 신고해도 한 건 (멱등) · 내 글 · 댓글은 신고할 수 없다 · 하루 30건 상한
   ───────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const { uid, userId } = await requireUser(req);
    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });
    const record = body as Record<string, unknown>;
    const { targetType, targetId } = requireTarget(record);

    const result = await reportContent(uid, userId, { targetType, targetId, reason: record.reason, detail: record.detail });
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
