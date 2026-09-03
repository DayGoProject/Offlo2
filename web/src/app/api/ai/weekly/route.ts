import { verifyIdToken, handleApiError, apiError } from "@/lib/firebase-admin";
import { buildWeeklyPrompt, getGeminiModel, parseGeminiJson, type DailySummary } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const WEEKLY_REQUIRED_DAYS = 7;

/**
 * POST /api/ai/weekly — 주간 종합 분석
 * body: { dailySummaries: DailySummary[] }  (이번 주 월~일 일간 분석 7개)
 * 반환: { analysisData: AnalysisResult }
 */
export async function POST(req: Request) {
  try {
    await verifyIdToken(req);

    const { dailySummaries } = (await req.json()) as { dailySummaries: unknown };

    if (!Array.isArray(dailySummaries) || dailySummaries.length < WEEKLY_REQUIRED_DAYS) {
      const count = Array.isArray(dailySummaries) ? dailySummaries.length : 0;
      throw apiError(
        `이번 주(월~일) 일간 분석이 ${count}개 있습니다. ${WEEKLY_REQUIRED_DAYS}개가 모여야 주간 분석을 시작할 수 있습니다.`,
        400
      );
    }
    if (dailySummaries.length > WEEKLY_REQUIRED_DAYS) {
      throw apiError(`dailySummaries는 최대 ${WEEKLY_REQUIRED_DAYS}개까지 허용됩니다.`, 400);
    }
    for (const s of dailySummaries) {
      if (
        !s ||
        typeof s !== "object" ||
        typeof s.totalMinutes !== "number" ||
        typeof s.detoxScore !== "number" ||
        typeof s.date !== "string" ||
        !Array.isArray(s.apps)
      ) {
        throw apiError("dailySummaries 형식이 올바르지 않습니다.", 400);
      }
    }

    const model = getGeminiModel();
    const result = await model.generateContent([
      { text: buildWeeklyPrompt(dailySummaries as DailySummary[]) },
    ]);

    const analysisData = parseGeminiJson(
      result.response.text(),
      "weekly",
      "주간 분석 결과를 처리하는 중 오류가 발생했습니다."
    );

    return Response.json({ analysisData });
  } catch (e) {
    return handleApiError(e);
  }
}
