import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast3" });

export interface AppUsage {
  appName: string;
  minutes: number;
  category: string;
}

export interface AnalysisResult {
  totalMinutes: number;
  apps: AppUsage[];
  topCategories: { category: string; minutes: number }[];
  recommendations: string[];
  detoxScore: number;
}

const GEMINI_PROMPT = `이 이미지는 스마트폰의 스크린타임(화면 사용 시간) 스크린샷입니다.
이미지에서 앱별 사용 시간 데이터를 추출하여 아래 JSON 형식으로만 응답해주세요.
마크다운 코드블록이나 다른 텍스트 없이 순수 JSON만 반환하세요.

{
  "totalMinutes": <총 사용시간(분), 정수>,
  "apps": [
    {
      "appName": "<앱 이름>",
      "minutes": <사용시간(분), 정수>,
      "category": "<SNS|엔터테인먼트|게임|생산성|커뮤니케이션|유틸리티|기타 중 하나>"
    }
  ],
  "topCategories": [
    { "category": "<카테고리명>", "minutes": <총 분, 정수> }
  ],
  "recommendations": [
    "<구체적인 디톡스 실천 방법 1>",
    "<구체적인 디톡스 실천 방법 2>",
    "<구체적인 디톡스 실천 방법 3>"
  ],
  "detoxScore": <0-100 사이 정수. 하루 총 스크린타임 기준으로 계산. 2시간 이하=90점대, 4시간=60점대, 6시간 이상=30점 이하>
}

스크린타임 데이터를 찾을 수 없거나 이미지가 스크린타임 화면이 아닌 경우:
{ "error": "스크린타임 데이터를 찾을 수 없습니다." }`;

export const analyzeScreenTime = onCall(
  { maxInstances: 10, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const { storagePath } = request.data as { storagePath: string };

    if (!storagePath || typeof storagePath !== "string") {
      throw new HttpsError("invalid-argument", "storagePath가 필요합니다.");
    }

    if (!storagePath.startsWith(`users/${uid}/`)) {
      throw new HttpsError("permission-denied", "접근 권한이 없습니다.");
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new HttpsError("internal", "서버 설정 오류가 발생했습니다.");
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", "이미지 파일을 찾을 수 없습니다.");
    }

    const [metadata] = await file.getMetadata();
    const mimeType = (metadata.contentType as string) || "image/jpeg";
    const [imageBuffer] = await file.download();
    const base64Image = imageBuffer.toString("base64");

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: GEMINI_PROMPT },
      { inlineData: { mimeType, data: base64Image } },
    ]);

    const responseText = result.response.text().trim();
    const jsonStr = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let analysisData: AnalysisResult;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.error) {
        throw new HttpsError("invalid-argument", parsed.error);
      }
      analysisData = parsed as AnalysisResult;
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "분석 결과를 처리하는 중 오류가 발생했습니다.");
    }

    const db = admin.firestore();
    const isPremium = request.auth.token["premium"] === true;

    const analysisRef = await db
      .collection("users")
      .doc(uid)
      .collection("analyses")
      .add({
        ...analysisData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isPremium,
      });

    // 분석 완료 후 이미지 삭제 (개인정보 최소화)
    await file.delete().catch(() => {
      // 삭제 실패해도 결과는 반환
    });

    return { analysisId: analysisRef.id };
  }
);
