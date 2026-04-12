import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── GET /api/goals — 내 목표 목록 조회 ────────────────────── */

export async function GET(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // "active" | "completed" | "paused" | null

    const VALID_STATUSES = ["active", "completed", "paused"];

    const goals = await prisma.goal.findMany({
      where: {
        userId: user.id,
        ...(status && VALID_STATUSES.includes(status) ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ goals });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── POST /api/goals — 목표 생성 ───────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    const { title, targetMinutes, startDate, endDate } = body as Record<string, unknown>;

    if (typeof title !== "string" || title.trim().length === 0 || title.length > 200)
      throw apiError("title은 1~200자여야 합니다.", 400);
    if (typeof targetMinutes !== "number" || targetMinutes <= 0 || targetMinutes > 10080)
      throw apiError("targetMinutes는 1~10080 사이의 정수여야 합니다.", 400);

    const start = parseDateParam(startDate, "startDate");
    const end = parseDateParam(endDate, "endDate");
    if (end <= start) throw apiError("endDate는 startDate 이후여야 합니다.", 400);

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: title.trim(),
        targetMinutes,
        startDate: start,
        endDate: end,
      },
    });

    return Response.json({ goal }, { status: 201 });
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

