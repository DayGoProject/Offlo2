import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── PATCH /api/goals/[id] — 목표 수정 ─────────────────────── */

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);
    const { id } = await params;

    if (!id || id.length > 128) throw apiError("유효하지 않은 목표 ID입니다.", 400);

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const goal = await prisma.goal.findUnique({ where: { id }, select: { userId: true } });
    if (!goal) throw apiError("목표를 찾을 수 없습니다.", 404);
    if (goal.userId !== user.id) throw apiError("접근 권한이 없습니다.", 403);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    const { title, targetMinutes, startDate, endDate, status } = body as Record<string, unknown>;

    const VALID_STATUSES = ["active", "completed", "paused"];
    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0 || title.length > 200)
        throw apiError("title은 1~200자여야 합니다.", 400);
      data.title = title.trim();
    }
    if (targetMinutes !== undefined) {
      if (typeof targetMinutes !== "number" || targetMinutes <= 0 || targetMinutes > 10080)
        throw apiError("targetMinutes는 1~10080 사이의 정수여야 합니다.", 400);
      data.targetMinutes = targetMinutes;
    }
    if (startDate !== undefined) data.startDate = parseDateParam(startDate, "startDate");
    if (endDate !== undefined) data.endDate = parseDateParam(endDate, "endDate");
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as string))
        throw apiError("status는 'active', 'completed', 'paused' 중 하나여야 합니다.", 400);
      data.status = status;
    }

    if (Object.keys(data).length === 0) throw apiError("수정할 필드가 없습니다.", 400);

    const updated = await prisma.goal.update({ where: { id }, data });
    return Response.json({ goal: updated });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── DELETE /api/goals/[id] — 목표 삭제 ────────────────────── */

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);
    const { id } = await params;

    if (!id || id.length > 128) throw apiError("유효하지 않은 목표 ID입니다.", 400);

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const goal = await prisma.goal.findUnique({ where: { id }, select: { userId: true } });
    if (!goal) throw apiError("목표를 찾을 수 없습니다.", 404);
    if (goal.userId !== user.id) throw apiError("접근 권한이 없습니다.", 403);

    await prisma.goal.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── 유틸 ──────────────────────────────────────────────────── */

function parseDateParam(value: unknown, fieldName: string): Date {
  if (typeof value !== "string") throw apiError(`${fieldName}이 필요합니다.`, 400);
  const date = new Date(value);
  if (isNaN(date.getTime())) throw apiError(`${fieldName}의 날짜 형식이 올바르지 않습니다.`, 400);
  return date;
}

