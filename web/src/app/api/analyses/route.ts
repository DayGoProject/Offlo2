import { verifyIdTokenFull, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── GET /api/analyses — 내 분석 목록 조회 ─────────────────── */

export async function GET(req: Request): Promise<Response> {
  try {
    const token = await verifyIdTokenFull(req);
    const uid = token.uid;

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const url = new URL(req.url);
    const periodType = url.searchParams.get("periodType"); // "daily" | "weekly" | null
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam ?? "20", 10) || 20, 100); // 최대 100

    const analyses = await prisma.analysis.findMany({
      where: {
        userId: user.id,
        ...(periodType === "daily" || periodType === "weekly" ? { periodType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        periodType: true,
        totalMinutes: true,
        detoxScore: true,
        isPremium: true,
        createdAt: true,
        // 목록에서는 무거운 JSON 필드 제외
      },
    });

    return Response.json({ analyses });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── POST /api/analyses — 분석 결과 저장 ───────────────────── */
// Cloud Function이 분석 완료 후 이 엔드포인트를 통해 Supabase에 저장한다. (6단계 이후 연결)

export async function POST(req: Request): Promise<Response> {
  try {
    const token = await verifyIdTokenFull(req);
    const uid = token.uid;

    // isPremium은 반드시 토큰 클레임에서 읽는다 — 본문에서 받으면 안 됨
    const isPremium = token["premium"] === true;

    const user = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
    if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    validateAnalysisBody(body);

    const {
      periodType, totalMinutes, apps, topCategories, recommendations,
      detoxScore, coreProblems, psychologicalCauses, detoxStrategies,
      dailyRoutine, timePatterns, sourceAnalysisIds,
    } = body;

    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        periodType,
        totalMinutes,
        apps,
        topCategories,
        recommendations,
        detoxScore,
        coreProblems,
        psychologicalCauses,
        detoxStrategies,
        dailyRoutine,
        timePatterns,
        sourceAnalysisIds: sourceAnalysisIds ?? null,
        isPremium,
      },
    });

    return Response.json({ analysisId: analysis.id }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

/* ── 입력 검증 ─────────────────────────────────────────────── */

function validateAnalysisBody(body: unknown): void {
  if (!body || typeof body !== "object") throw apiError("본문이 올바르지 않습니다.", 400);
  const d = body as Record<string, unknown>;

  if (d.periodType !== "daily" && d.periodType !== "weekly")
    throw apiError("periodType은 'daily' 또는 'weekly'여야 합니다.", 400);
  if (typeof d.totalMinutes !== "number" || d.totalMinutes < 0 || d.totalMinutes > 10080)
    throw apiError("totalMinutes 값이 유효하지 않습니다.", 400);
  if (typeof d.detoxScore !== "number" || d.detoxScore < 0 || d.detoxScore > 100)
    throw apiError("detoxScore 값이 유효하지 않습니다.", 400);
  if (!Array.isArray(d.apps) || d.apps.length > 50)
    throw apiError("apps 필드가 유효하지 않습니다.", 400);
  if (!Array.isArray(d.topCategories)) throw apiError("topCategories 필드가 필요합니다.", 400);
  if (!Array.isArray(d.recommendations)) throw apiError("recommendations 필드가 필요합니다.", 400);
  if (!Array.isArray(d.coreProblems)) throw apiError("coreProblems 필드가 필요합니다.", 400);
  if (!Array.isArray(d.psychologicalCauses)) throw apiError("psychologicalCauses 필드가 필요합니다.", 400);
  if (!Array.isArray(d.detoxStrategies)) throw apiError("detoxStrategies 필드가 필요합니다.", 400);
  if (!d.dailyRoutine || typeof d.dailyRoutine !== "object") throw apiError("dailyRoutine 필드가 필요합니다.", 400);
  if (!Array.isArray(d.timePatterns)) throw apiError("timePatterns 필드가 필요합니다.", 400);
}

