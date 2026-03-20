import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast3" });

/* ── 타입 정의 ─────────────────────────────────────────────── */

export interface AppUsage {
  appName: string;
  minutes: number;
  category: string;
}

export interface TimePattern {
  timeSlot: string;   // 예: "오후 9시~11시"
  apps: string[];     // 해당 시간대 집중 앱
  question: string;   // AI가 사용자에게 물어볼 질문
}

export interface DailyRoutine {
  morning: string;    // 아침 실천 계획
  afternoon: string;  // 낮 실천 계획
  evening: string;    // 밤 실천 계획
}

export interface AnalysisResult {
  totalMinutes: number;
  periodType: "daily" | "weekly";
  apps: AppUsage[];
  topCategories: { category: string; minutes: number }[];
  recommendations: string[];
  detoxScore: number;
  // 상세 분석 필드
  coreProblems: string[];
  psychologicalCauses: string[];
  detoxStrategies: string[];
  dailyRoutine: DailyRoutine;
  timePatterns: TimePattern[];
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  imagePath?: string;  // Firebase Storage 경로 (선택)
}

/* ── Gemini 분석 프롬프트 ───────────────────────────────────── */

const ANALYSIS_PROMPT = `당신은 디지털 웰빙 전문 AI 코치입니다.
이 이미지는 스마트폰의 스크린타임(화면 사용 시간) 스크린샷입니다.

[분석 지시사항]
1. 이 스크린샷이 "일간(하루)" 분석인지 "주간(7일)" 분석인지 먼저 판별하세요.
   - 일간: 오늘 또는 특정 하루의 앱별 사용 시간, 시간대별 그래프가 보이는 경우
   - 주간: 최근 7일, 일주일 간의 사용 시간 합계 또는 일별 막대 그래프가 보이는 경우
2. 이미지에서 모든 앱별 사용 시간을 최대한 정확하게 추출하세요.
3. 일간 분석일 경우, 시간대별 패턴(언제 어떤 앱을 많이 쓰는지)도 파악하세요.
4. 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "periodType": "daily 또는 weekly",
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
  "detoxScore": <0-100 정수. 일간: 2시간이하=90점대, 4시간=60점대, 6시간이상=30점이하 / 주간: 14시간이하=90점대, 28시간=60점대, 42시간이상=30점이하>,
  "coreProblems": [
    "<이 사용 패턴의 핵심 문제점 1 — 구체적 수치와 앱 이름 포함하여 2-3문장>",
    "<핵심 문제점 2>",
    "<핵심 문제점 3>"
  ],
  "psychologicalCauses": [
    "<이런 사용 패턴이 생긴 심리적 원인 1 — 행동심리학 관점에서 설명>",
    "<심리적 원인 2>",
    "<심리적 원인 3>"
  ],
  "detoxStrategies": [
    "<가장 효과적인 디톡스 전략 1 — 오늘 당장 할 수 있는 구체적 행동 포함>",
    "<전략 2>",
    "<전략 3>",
    "<전략 4>",
    "<전략 5>"
  ],
  "dailyRoutine": {
    "morning": "<아침 루틴 실천 계획 — 기상 후 스마트폰 사용 제한 방법 포함, 2-3문장>",
    "afternoon": "<낮 루틴 실천 계획 — 집중 시간 확보 및 SNS 차단 방법, 2-3문장>",
    "evening": "<밤 루틴 실천 계획 — 취침 전 디지털 디톡스 방법 포함, 2-3문장>"
  },
  "timePatterns": [
    {
      "timeSlot": "<사용이 집중되는 시간대, 예: 오후 9시~11시>",
      "apps": ["<앱1>", "<앱2>"],
      "question": "<이 시간대 사용에 대해 사용자에게 물어볼 공감적이고 구체적인 질문 1가지>"
    }
  ],
  "recommendations": [
    "<핵심 권고사항 1>",
    "<핵심 권고사항 2>",
    "<핵심 권고사항 3>"
  ]
}

timePatterns는 일간 분석에서 시간대 정보가 보일 때만 최대 3개 포함하고, 없으면 빈 배열 []로 반환하세요.
스크린타임 데이터를 찾을 수 없거나 스크린타임 화면이 아닌 경우:
{ "error": "스크린타임 데이터를 찾을 수 없습니다." }`;

/* ── 채팅 시스템 프롬프트 ───────────────────────────────────── */

function buildChatSystemPrompt(analysis: AnalysisResult): string {
  const period = analysis.periodType === "daily" ? "일간" : "주간";
  const topApps = analysis.apps
    .slice(0, 5)
    .map((a) => `${a.appName}(${Math.floor(a.minutes / 60)}시간${a.minutes % 60}분)`)
    .join(", ");

  return `당신은 공감적이고 전문적인 디지털 웰빙 코치 AI입니다.
사용자의 스마트폰 스크린타임 분석 결과를 바탕으로 1:1 상담을 진행합니다.

[분석된 사용자 데이터]
- 분석 유형: ${period} 분석
- 총 사용 시간: ${Math.floor(analysis.totalMinutes / 60)}시간 ${analysis.totalMinutes % 60}분
- 주요 앱: ${topApps}
- 디톡스 점수: ${analysis.detoxScore}/100
- 핵심 문제: ${analysis.coreProblems?.join(" / ")}

[대화 지침]
1. 사용자의 구체적인 사용 패턴(어떤 시간대, 어떤 앱)에 대해 공감하며 질문하세요.
2. 특정 시간대에 특정 앱을 많이 사용할 경우:
   - "이 시간대에 주로 어떤 목적으로 사용하시는지 여쭤봐도 될까요?"
   - "혹시 이 시간의 사용을 조금 줄여보실 의향이 있으신가요?"
   - "이 시간에 어떤 소셜 미디어 앱을 주로 사용하시는 건가요?"
   같은 방식으로 부드럽게 물어보세요.
3. 사용자가 이미지를 첨부하면 해당 이미지도 분석에 활용하세요.
4. 판단하거나 비난하지 말고, 변화의 작은 첫 걸음을 응원하는 톤을 유지하세요.
5. 답변은 2-4문장으로 간결하게, 마지막엔 항상 하나의 구체적인 질문이나 제안으로 끝내세요.
6. 한국어로만 답변하세요.`;
}

/* ── Cloud Function: analyzeScreenTime ─────────────────────── */

export const analyzeScreenTime = onCall(
  { maxInstances: 10, timeoutSeconds: 90 },
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
      { text: ANALYSIS_PROMPT },
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
      if (parsed.error) throw new HttpsError("invalid-argument", parsed.error);
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
    await file.delete().catch(() => {});

    return { analysisId: analysisRef.id };
  }
);

/* ── Cloud Function: chatWithAnalysis ──────────────────────── */

export const chatWithAnalysis = onCall(
  { maxInstances: 10, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const { analysisId, messages } = request.data as {
      analysisId: string;
      messages: ChatMessage[];
    };

    if (!analysisId || !Array.isArray(messages)) {
      throw new HttpsError("invalid-argument", "analysisId와 messages가 필요합니다.");
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new HttpsError("internal", "서버 설정 오류가 발생했습니다.");
    }

    // Firestore에서 분석 데이터 로드
    const db = admin.firestore();
    const analysisSnap = await db
      .collection("users")
      .doc(uid)
      .collection("analyses")
      .doc(analysisId)
      .get();

    if (!analysisSnap.exists) {
      throw new HttpsError("not-found", "분석 결과를 찾을 수 없습니다.");
    }
    const analysis = analysisSnap.data() as AnalysisResult;

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildChatSystemPrompt(analysis),
    });

    // 마지막 메시지(사용자의 현재 입력)를 분리
    const history = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== "user") {
      throw new HttpsError("invalid-argument", "마지막 메시지는 user 역할이어야 합니다.");
    }

    // 이전 대화 이력을 Gemini 형식으로 변환
    const geminiHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: geminiHistory });

    // 현재 사용자 메시지 구성 (이미지 포함 가능)
    const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
      [{ text: lastMessage.text }];

    // 채팅 이미지 첨부 처리
    if (lastMessage.imagePath) {
      const chatImagePath = lastMessage.imagePath;

      // 보안: 본인 경로만 허용
      if (!chatImagePath.startsWith(`users/${uid}/`)) {
        throw new HttpsError("permission-denied", "접근 권한이 없습니다.");
      }

      const bucket = admin.storage().bucket();
      const chatFile = bucket.file(chatImagePath);
      const [imgExists] = await chatFile.exists();

      if (imgExists) {
        const [imgMeta] = await chatFile.getMetadata();
        const imgMime = (imgMeta.contentType as string) || "image/jpeg";
        const [imgBuffer] = await chatFile.download();
        userParts.push({
          inlineData: { mimeType: imgMime, data: imgBuffer.toString("base64") },
        });
        // 채팅 이미지도 사용 후 삭제
        await chatFile.delete().catch(() => {});
      }
    }

    const result = await chat.sendMessage(userParts);
    const replyText = result.response.text().trim();

    return { reply: replyText };
  }
);
