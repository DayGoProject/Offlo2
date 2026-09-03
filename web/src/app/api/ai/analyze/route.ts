import { verifyIdToken, handleApiError } from "@/lib/firebase-admin";
import {
  DAILY_ANALYSIS_PROMPT,
  assertInlineImage,
  getGeminiModel,
  parseGeminiJson,
} from "@/lib/ai";

// firebase-admin(토큰 검증)은 Node 런타임 필요 (Edge 불가)
export const runtime = "nodejs";
// Gemini Vision 응답 대기 — Vercel Hobby 상한
export const maxDuration = 60;

/**
 * POST /api/ai/analyze — 일간 스크린타임 이미지 분석
 * body: { imageBase64: string, mimeType: string }
 * 반환: { analysisData: AnalysisResult }
 *
 * 이미지는 저장하지 않는다 — 클라이언트가 압축해 보낸 데이터를 그대로 Gemini에 전달하고 버린다.
 * 분석 결과 저장은 프론트엔드가 POST /api/analyses로 처리.
 */
export async function POST(req: Request) {
  try {
    await verifyIdToken(req);

    const { imageBase64, mimeType } = (await req.json()) as {
      imageBase64: unknown;
      mimeType: unknown;
    };
    assertInlineImage(imageBase64, mimeType);

    const model = getGeminiModel();
    const result = await model.generateContent([
      { text: DAILY_ANALYSIS_PROMPT },
      { inlineData: { mimeType: mimeType as string, data: imageBase64 } },
    ]);

    const analysisData = parseGeminiJson(
      result.response.text(),
      "daily",
      "분석 결과를 처리하는 중 오류가 발생했습니다."
    );

    return Response.json({ analysisData });
  } catch (e) {
    return handleApiError(e);
  }
}
