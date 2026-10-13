import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { onGoalCompleted } from "@/lib/garden";

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

    const goal = await prisma.goal.findUnique({ where: { id }, select: { userId: true, status: true } });
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

    // 완료한 목표를 다시 진행 중으로 돌렸다가 또 완료하면 보상을 반복해서 받을 수 있다 — 완료는 되돌리지 않는다 (웹·앱 모두 되돌리는 화면이 없다)
    if (goal.status === "completed" && data.status !== undefined && data.status !== "completed")
      throw apiError("이미 완료한 목표의 상태는 바꿀 수 없습니다.", 409);

    // 완료 보상(식물 경험치 +20분 · "목표 달성" 배지)은 **처음 완료될 때 한 번만** 준다.
    // 예전에는 `status: "completed"`를 보낼 때마다 지급해서, 이미 완료한 목표를 반복해서 완료로 보내면 경험치를 무한히 올릴 수 있었다.
    // 읽고-쓰는 사이에 같은 요청이 겹쳐도 한 번만 지급되도록, "완료가 아닌 것만" 바꾸는 조건부 갱신(`updateMany`)의 결과로 가른다.
    let firstCompletion = false;
    if (data.status === "completed") {
      const { count } = await prisma.goal.updateMany({ where: { id, status: { not: "completed" } }, data });
      firstCompletion = count === 1;
      if (!firstCompletion) {
        // 이미 완료였다 — 상태는 그대로 두고 함께 온 다른 필드(제목 등)만 반영한다
        const { status: _unchanged, ...rest } = data;
        void _unchanged;
        if (Object.keys(rest).length > 0) await prisma.goal.update({ where: { id }, data: rest });
      }
    } else {
      await prisma.goal.update({ where: { id }, data });
    }
    const updated = await prisma.goal.findUnique({ where: { id } });

    // 목표가 처음 완료 처리된 경우에만 게이미피케이션
    if (firstCompletion) {
      onGoalCompleted(uid, user.id).catch(console.error);
    }

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

