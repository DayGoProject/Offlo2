import { apiError, handleApiError } from "@/lib/firebase-admin";
import { liftSanction, listActiveSanctions, requireAdmin } from "@/lib/moderation-admin";

/* ── GET /api/admin/sanctions — 지금 제재 중인 사용자 (관리자 전용 · 아니면 404) ──
   반환: { sanctions: ActiveSanction[] } — 계정 영구 정지 · 커뮤니티 정지 중인 사람. 열 때 보관 기간이 지난 기록을 정리한다.
   ─────────────────────────────────────────────────────── */

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin(req);
    return Response.json({ sanctions: await listActiveSanctions() });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── POST /api/admin/sanctions — 제재 해제 (이의 제기를 받아들였을 때)
   body: { action: "lift", emailKey } — 커뮤니티 정지 · 계정 영구 정지를 모두 푼다 (정지했던 Firebase 계정도 다시 연다). 경고 횟수는 이력으로 남는다.
   ─────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const adminUid = await requireAdmin(req);
    const body = (await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    })) as Record<string, unknown>;
    if (body.action !== "lift") throw apiError("지원하지 않는 작업입니다.", 400);
    await liftSanction(adminUid, body.emailKey);
    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
