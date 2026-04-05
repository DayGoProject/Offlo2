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
  timeSlot: string;
  apps: string[];
  question: string;
}

export interface DailyRoutine {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface AnalysisResult {
  totalMinutes: number;
  periodType: "daily" | "weekly";
  apps: AppUsage[];
  topCategories: { category: string; minutes: number }[];
  recommendations: string[];
  detoxScore: number;
  coreProblems: string[];
  psychologicalCauses: string[];
  detoxStrategies: string[];
  dailyRoutine: DailyRoutine;
  timePatterns: TimePattern[];
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  imagePath?: string;
}

/* ── 보안 유틸 ──────────────────────────────────────────────── */

/** storagePath가 uid 소유의 허용된 경로인지 검증 */
function assertStoragePath(storagePath: unknown, uid: string): asserts storagePath is string {
  if (!storagePath || typeof storagePath !== "string")
    throw new HttpsError("invalid-argument", "storagePath가 필요합니다.");
  // 허용 경로: users/{uid}/screenshots/{file} 또는 users/{uid}/chat-images/{file}
  const validPattern = /^users\/[^/]+\/(screenshots|chat-images)\/[^/]+$/;
  if (!storagePath.startsWith(`users/${uid}/`) || !validPattern.test(storagePath))
    throw new HttpsError("permission-denied", "접근 권한이 없습니다.");
}

/** Gemini 응답 JSON의 필수 필드를 검증 */
function validateAnalysisResult(data: unknown): asserts data is AnalysisResult {
  if (!data || typeof data !== "object")
    throw new Error("분석 결과 형식이 올바르지 않습니다.");
  const d = data as Record<string, unknown>;
  if (typeof d.totalMinutes !== "number" || d.totalMinutes < 0 || d.totalMinutes > 1440)
    throw new Error("totalMinutes 값이 유효하지 않습니다.");
  if (typeof d.detoxScore !== "number" || d.detoxScore < 0 || d.detoxScore > 100)
    throw new Error("detoxScore 값이 유효하지 않습니다.");
  if (!Array.isArray(d.apps) || d.apps.length > 50)
    throw new Error("apps 필드가 유효하지 않습니다.");
  if (!Array.isArray(d.recommendations))
    throw new Error("recommendations 필드가 유효하지 않습니다.");
  if (!Array.isArray(d.topCategories))
    throw new Error("topCategories 필드가 유효하지 않습니다.");
}

/* ── 일간 분석 프롬프트 (이미지 → JSON) ────────────────────── */

const DAILY_ANALYSIS_PROMPT = `당신은 디지털 웰빙 전문 AI 코치입니다.
이 이미지는 스마트폰에서 "일(日)" 탭을 선택한 하루치 스크린타임 스크린샷입니다.

[분석 지시사항]
1. 이미지에서 오늘 하루의 앱별 사용 시간을 최대한 정확하게 추출하세요.
2. 시간대별 패턴이 보이면 어느 시간대에 어떤 앱을 많이 사용했는지 파악하세요.
3. 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "periodType": "daily",
  "totalMinutes": <오늘 총 사용시간(분), 정수>,
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
  "detoxScore": <0-100 정수. 2시간이하=90점대, 4시간=60점대, 6시간이상=30점이하>,
  "coreProblems": [
    "<오늘 사용 패턴의 핵심 문제 1 — 구체적 수치와 앱 이름 포함>",
    "<핵심 문제 2>",
    "<핵심 문제 3>"
  ],
  "psychologicalCauses": [
    "<이런 사용 패턴의 심리적 원인 1 — 행동심리학 관점>",
    "<심리적 원인 2>",
    "<심리적 원인 3>"
  ],
  "detoxStrategies": [
    "<오늘 당장 실천할 수 있는 디톡스 전략 1 — 구체적 행동 포함>",
    "<전략 2>",
    "<전략 3>",
    "<전략 4>",
    "<전략 5>"
  ],
  "dailyRoutine": {
    "morning": "<아침 루틴 계획 — 기상 후 스마트폰 제한 방법 포함>",
    "afternoon": "<낮 루틴 계획 — 집중 시간 확보 방법>",
    "evening": "<밤 루틴 계획 — 취침 전 디지털 디톡스 방법>"
  },
  "timePatterns": [
    {
      "timeSlot": "<사용이 집중되는 시간대, 예: 오후 9시~11시>",
      "apps": ["<앱1>", "<앱2>"],
      "question": "<이 시간대 사용에 대해 공감적으로 물어볼 질문 1가지>"
    }
  ],
  "recommendations": [
    "<핵심 권고사항 1>",
    "<핵심 권고사항 2>",
    "<핵심 권고사항 3>"
  ]
}

timePatterns는 시간대 정보가 보일 때만 최대 3개 포함하고, 없으면 빈 배열 []로 반환하세요.
스크린타임 데이터를 찾을 수 없거나 스크린타임 화면이 아닌 경우:
{ "error": "스크린타임 데이터를 찾을 수 없습니다." }`;

/* ── 주간 분석 프롬프트 빌더 (텍스트 → JSON) ────────────────── */

interface DailySummary {
  date: string;
  totalMinutes: number;
  apps: AppUsage[];
  detoxScore: number;
}

function buildWeeklyPrompt(days: DailySummary[]): string {
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0);
  const avgMinutes = Math.round(totalMinutes / days.length);

  const daysText = days
    .map((d, i) => {
      const h = Math.floor(d.totalMinutes / 60);
      const m = d.totalMinutes % 60;
      const topApps = d.apps
        .slice(0, 6)
        .map(
          (a) =>
            `  - ${a.appName}: ${Math.floor(a.minutes / 60)}시간 ${a.minutes % 60}분 (${a.category})`
        )
        .join("\n");
      return `[${i + 1}일차 | ${d.date} | 디톡스 ${d.detoxScore}점]\n총 ${h}시간 ${m}분\n${topApps}`;
    })
    .join("\n\n");

  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  const avgH = Math.floor(avgMinutes / 60);
  const avgM = avgMinutes % 60;

  return `당신은 디지털 웰빙 전문 AI 코치입니다.
다음은 사용자의 최근 ${days.length}일간 일일 스마트폰 스크린타임 데이터입니다.

${daysText}

[주간 통계]
- 주간 총 사용 시간: ${totalH}시간 ${totalM}분
- 일 평균 사용 시간: ${avgH}시간 ${avgM}분
- 평균 디톡스 점수: ${Math.round(days.reduce((s, d) => s + d.detoxScore, 0) / days.length)}점

위 ${days.length}일간 데이터를 종합하여 주간 분석 리포트를 작성해주세요.
요일별 패턴, 주간 변화 추이, 개선된 점과 악화된 점을 반드시 포함하세요.
아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "periodType": "weekly",
  "totalMinutes": ${totalMinutes},
  "apps": [
    {
      "appName": "<앱 이름>",
      "minutes": <주간 총 사용시간(분), 정수>,
      "category": "<SNS|엔터테인먼트|게임|생산성|커뮤니케이션|유틸리티|기타>"
    }
  ],
  "topCategories": [
    { "category": "<카테고리명>", "minutes": <주간 총 분> }
  ],
  "detoxScore": <주간 평균 디톡스 점수 0-100>,
  "coreProblems": [
    "<주간 사용 패턴의 핵심 문제 1 — 요일 패턴, 증감 추이 포함>",
    "<핵심 문제 2>",
    "<핵심 문제 3>"
  ],
  "psychologicalCauses": [
    "<이 주간 패턴의 심리적 원인 1>",
    "<원인 2>",
    "<원인 3>"
  ],
  "detoxStrategies": [
    "<다음 주를 위한 디톡스 전략 1 — 구체적 실천 방법>",
    "<전략 2>",
    "<전략 3>",
    "<전략 4>",
    "<전략 5>"
  ],
  "dailyRoutine": {
    "morning": "<다음 주 아침 루틴 개선 계획>",
    "afternoon": "<다음 주 낮 루틴 개선 계획>",
    "evening": "<다음 주 저녁/밤 루틴 개선 계획>"
  },
  "timePatterns": [],
  "recommendations": [
    "<주간 종합 권고사항 1>",
    "<권고사항 2>",
    "<권고사항 3>"
  ]
}`;
}

/* ── 채팅 시스템 프롬프트 ───────────────────────────────────── */

function buildChatSystemPrompt(analysis: AnalysisResult): string {
  const period = analysis.periodType === "daily" ? "일간" : "주간";
  const topApps = analysis.apps
    .slice(0, 5)
    .map((a) => `${a.appName}(${Math.floor(a.minutes / 60)}시간 ${a.minutes % 60}분)`)
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
1. 특정 시간대에 특정 앱을 많이 사용할 경우 공감하며 이렇게 물어보세요:
   - "이 시간대에 주로 어떤 목적으로 사용하시는지 여쭤봐도 될까요?"
   - "혹시 이 시간의 사용을 조금 줄여보실 의향이 있으신가요?"
   - "이 시간에 어떤 소셜 미디어 앱을 주로 사용하시는 건가요?"
2. 사용자가 이미지를 첨부하면 해당 이미지도 분석에 활용하세요.
3. 판단하거나 비난하지 말고, 변화의 작은 첫 걸음을 응원하는 톤을 유지하세요.
4. 답변은 2-4문장으로 간결하게, 마지막엔 항상 구체적인 질문이나 제안으로 끝내세요.
5. 한국어로만 답변하세요.`;
}

/* ── Cloud Function: analyzeScreenTime (일간) ──────────────── */

export const analyzeScreenTime = onCall(
  { maxInstances: 10, timeoutSeconds: 90 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const uid = request.auth.uid;
    const { storagePath } = request.data as { storagePath: unknown };
    assertStoragePath(storagePath, uid);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new HttpsError("internal", "서버 설정 오류가 발생했습니다.");

    // ── 오늘(KST 기준) 이미 일간 분석이 존재하면 차단 ──
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstNow = new Date(Date.now() + KST_OFFSET);
    kstNow.setUTCHours(0, 0, 0, 0); // KST 오늘 00:00
    const todayStartUTC = new Date(kstNow.getTime() - KST_OFFSET);

    const todaySnap = await admin.firestore()
      .collection("users").doc(uid).collection("analyses")
      .where("periodType", "==", "daily")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(todayStartUTC))
      .limit(1)
      .get();

    if (!todaySnap.empty) {
      throw new HttpsError(
        "already-exists",
        "오늘은 이미 일간 분석을 완료했습니다. 일간 분석은 하루에 한 번만 가능합니다."
      );
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) throw new HttpsError("not-found", "이미지 파일을 찾을 수 없습니다.");

    const [metadata] = await file.getMetadata();
    const mimeType = (metadata.contentType as string) || "image/jpeg";
    const [imageBuffer] = await file.download();
    const base64Image = imageBuffer.toString("base64");

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: DAILY_ANALYSIS_PROMPT },
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
      parsed.periodType = "daily";
      validateAnalysisResult(parsed);
      analysisData = parsed;
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "분석 결과를 처리하는 중 오류가 발생했습니다.");
    }

    const db = admin.firestore();
    const isPremium = request.auth.token["premium"] === true;

    const analysisRef = await db
      .collection("users").doc(uid).collection("analyses")
      .add({
        ...analysisData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isPremium,
      });

    await file.delete().catch((e) => console.error(`스토리지 파일 삭제 실패: ${storagePath}`, e));
    return { analysisId: analysisRef.id };
  }
);

/**
 * 현재 달력 주의 월요일 00:00 KST를 UTC Date로 반환
 * Cloud Functions 서버는 UTC로 동작하므로 KST(+9) 오프셋을 적용
 */
function getKSTWeekStart(): Date {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + KST_OFFSET);
  const dayOfWeek = kstNow.getUTCDay(); // 0=일, 1=월 … 6=토
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const kstMonday = new Date(kstNow);
  kstMonday.setUTCDate(kstNow.getUTCDate() + daysToMonday);
  kstMonday.setUTCHours(0, 0, 0, 0); // KST 월요일 00:00
  return new Date(kstMonday.getTime() - KST_OFFSET); // → UTC로 변환
}

/* ── Cloud Function: generateWeeklyAnalysis ────────────────── */

export const generateWeeklyAnalysis = onCall(
  { maxInstances: 5, timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const uid = request.auth.uid;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new HttpsError("internal", "서버 설정 오류가 발생했습니다.");

    const db = admin.firestore();

    // 이번 달력 주(월요일 00:00 KST 이후)의 일간 분석만 로드
    const weekStart = admin.firestore.Timestamp.fromDate(getKSTWeekStart());
    const snap = await db
      .collection("users").doc(uid).collection("analyses")
      .where("periodType", "==", "daily")
      .where("createdAt", ">=", weekStart)
      .orderBy("createdAt", "desc")
      .limit(7)
      .get();

    if (snap.size < 7) {
      throw new HttpsError(
        "failed-precondition",
        `이번 주(월~일) 일간 분석이 ${snap.size}개 있습니다. 7개가 모여야 주간 분석을 시작할 수 있습니다.`
      );
    }

    // 날짜 오름차순으로 정렬 (오래된 것부터)
    const docs = snap.docs.reverse();

    const dailySummaries: DailySummary[] = docs.map((doc) => {
      const data = doc.data();
      const ts = data.createdAt as admin.firestore.Timestamp | null;
      const date = ts
        ? ts.toDate().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })
        : "날짜 없음";
      return {
        date,
        totalMinutes: data.totalMinutes as number,
        apps: (data.apps as AppUsage[]) ?? [],
        detoxScore: data.detoxScore as number,
      };
    });

    const weeklyPrompt = buildWeeklyPrompt(dailySummaries);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([{ text: weeklyPrompt }]);

    const responseText = result.response.text().trim();
    const jsonStr = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let weeklyData: AnalysisResult;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.error) throw new HttpsError("invalid-argument", parsed.error);
      parsed.periodType = "weekly";
      validateAnalysisResult(parsed);
      weeklyData = parsed;
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "주간 분석 결과를 처리하는 중 오류가 발생했습니다.");
    }

    const isPremium = request.auth.token["premium"] === true;
    const sourceIds = docs.map((d) => d.id);

    const weeklyRef = await db
      .collection("users").doc(uid).collection("analyses")
      .add({
        ...weeklyData,
        sourceAnalysisIds: sourceIds,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isPremium,
      });

    return { analysisId: weeklyRef.id };
  }
);

/* ── Cloud Function: chatWithAnalysis ──────────────────────── */

export const chatWithAnalysis = onCall(
  { maxInstances: 10, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const uid = request.auth.uid;
    const { analysisId, messages } = request.data as {
      analysisId: string;
      messages: ChatMessage[];
    };

    if (!analysisId || typeof analysisId !== "string" || analysisId.length > 128)
      throw new HttpsError("invalid-argument", "analysisId가 유효하지 않습니다.");
    if (!Array.isArray(messages))
      throw new HttpsError("invalid-argument", "messages가 필요합니다.");
    if (messages.length > 50)
      throw new HttpsError("invalid-argument", "메시지 수가 너무 많습니다. (최대 50개)");
    for (const msg of messages) {
      if (msg.role !== "user" && msg.role !== "model")
        throw new HttpsError("invalid-argument", "잘못된 메시지 역할입니다.");
      if (typeof msg.text !== "string" || msg.text.length > 2000)
        throw new HttpsError("invalid-argument", "메시지 내용이 너무 깁니다. (최대 2000자)");
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new HttpsError("internal", "서버 설정 오류가 발생했습니다.");

    const db = admin.firestore();
    const analysisSnap = await db
      .collection("users").doc(uid).collection("analyses").doc(analysisId).get();

    if (!analysisSnap.exists) throw new HttpsError("not-found", "분석 결과를 찾을 수 없습니다.");
    const analysis = analysisSnap.data() as AnalysisResult;

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildChatSystemPrompt(analysis),
    });

    const history = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== "user")
      throw new HttpsError("invalid-argument", "마지막 메시지는 user 역할이어야 합니다.");

    // Gemini history는 반드시 user role부터 시작해야 함
    // 초기 AI 인사 메시지(model role)를 제거하고 첫 user 메시지부터 포함
    const firstUserIdx = history.findIndex((m) => m.role === "user");
    const cleanHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : [];

    const geminiHistory = cleanHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: geminiHistory });

    const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
      [{ text: lastMessage.text }];

    if (lastMessage.imagePath) {
      assertStoragePath(lastMessage.imagePath, uid);

      const bucket = admin.storage().bucket();
      const chatFile = bucket.file(lastMessage.imagePath);
      const [imgExists] = await chatFile.exists();
      if (imgExists) {
        const [imgMeta] = await chatFile.getMetadata();
        const imgMime = (imgMeta.contentType as string) || "image/jpeg";
        const [imgBuffer] = await chatFile.download();
        userParts.push({ inlineData: { mimeType: imgMime, data: imgBuffer.toString("base64") } });
        await chatFile.delete().catch((e) =>
          console.error(`채팅 이미지 삭제 실패: ${lastMessage.imagePath}`, e)
        );
      }
    }

    const result = await chat.sendMessage(userParts);
    return { reply: result.response.text().trim() };
  }
);
