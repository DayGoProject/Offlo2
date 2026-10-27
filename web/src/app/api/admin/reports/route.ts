import { apiError, handleApiError } from "@/lib/firebase-admin";
import { listReportQueue, parseResolve, requireAdmin, resolveReport } from "@/lib/moderation-admin";

/* ── GET /api/admin/reports — 처리할 신고 큐 (관리자 전용 · 아니면 404) ──
   반환: { items: QueueItem[] } — 모두에게 숨겨진 것 · 신고가 많은 것 순. 신고자 신원은 내려주지 않는다.
   ─────────────────────────────────────────────────────── */

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin(req);
    return Response.json({ items: await listReportQueue() });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── POST /api/admin/reports — 신고 하나를 처리 ─────────────
   body: { targetType: "post" | "comment", targetId, action: "dismiss" | "delete",
           sanction?: { kind: "warn" | "community" | "ban", days?: 7 | 30 | null, reason?: 신고 사유 } }
   · dismiss — 신고를 기각하고 숨김을 푼다 (제재 불가)
   · delete  — 글 · 댓글을 지우고 신고를 조치 완료로 바꾼다. `sanction`이 있으면 작성자에게 경고 · 커뮤니티 정지 · 계정 영구 정지를 준다
   ─────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const adminUid = await requireAdmin(req);
    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });
    return Response.json(await resolveReport(adminUid, parseResolve(body)));
  } catch (e) {
    return handleApiError(e);
  }
}
