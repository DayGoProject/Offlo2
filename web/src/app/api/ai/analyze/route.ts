import { verifyIdToken, handleApiError, getAdminBucket, apiError } from "@/lib/firebase-admin";
import {
  DAILY_ANALYSIS_PROMPT,
  assertStoragePath,
  getGeminiModel,
  parseGeminiJson,
} from "@/lib/ai";

// firebase-admin은 Node 런타임 필요 (Edge 불가)
export const runtime = "nodejs";
// Gemini Vision 응답 대기 — Vercel Hobby 상한
export const maxDuration = 60;

/**
 * POST /api/ai/analyze — 일간 스크린타임 이미지 분석
 * body: { storagePath: string }
 * 반환: { analysisData: AnalysisResult }
 *
 * Storage에서 이미지를 내려받아 Gemini로 분석한 뒤, 원본 이미지는 즉시 삭제한다.
 * 분석 결과 저장은 프론트엔드가 POST /api/analyses로 처리.
 */
export async function POST(req: Request) {
  try {
    const uid = await verifyIdToken(req);

    const { storagePath } = (await req.json()) as { storagePath: unknown };
    assertStoragePath(storagePath, uid);

    const file = getAdminBucket().file(storagePath);
    const [exists] = await file.exists();
    if (!exists) throw apiError("이미지 파일을 찾을 수 없습니다.", 404);

    const [metadata] = await file.getMetadata();
    const mimeType = (metadata.contentType as string) || "image/jpeg";
    const [imageBuffer] = await file.download();

    const model = getGeminiModel();
    const result = await model.generateContent([
      { text: DAILY_ANALYSIS_PROMPT },
      { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
    ]);

    // Storage 파일은 분석 완료 즉시 삭제 (개인정보 보호)
    await file
      .delete()
      .catch((e) => console.error(`스토리지 파일 삭제 실패: ${storagePath}`, e));

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
