import { verifyIdToken, handleApiError, apiError } from "@/lib/firebase-admin";
import {
  assertInlineImage,
  buildChatSystemPrompt,
  getGeminiModel,
  type AnalysisContext,
  type ChatMessage,
} from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * POST /api/ai/chat — 분석 결과 기반 AI 코치 채팅
 * body: { analysisId, messages: ChatMessage[], analysisContext: AnalysisContext }
 * 반환: { reply: string }
 */
export async function POST(req: Request) {
  try {
    await verifyIdToken(req);

    const { analysisId, messages, analysisContext } = (await req.json()) as {
      analysisId: unknown;
      messages: unknown;
      analysisContext: unknown;
    };

    if (!analysisId || typeof analysisId !== "string" || analysisId.length > 128)
      throw apiError("analysisId가 유효하지 않습니다.", 400);
    if (!Array.isArray(messages)) throw apiError("messages가 필요합니다.", 400);
    if (messages.length > MAX_MESSAGES)
      throw apiError(`메시지 수가 너무 많습니다. (최대 ${MAX_MESSAGES}개)`, 400);
    for (const msg of messages) {
      if (msg?.role !== "user" && msg?.role !== "model")
        throw apiError("잘못된 메시지 역할입니다.", 400);
      if (typeof msg.text !== "string" || msg.text.length > MAX_MESSAGE_LENGTH)
        throw apiError(`메시지 내용이 너무 깁니다. (최대 ${MAX_MESSAGE_LENGTH}자)`, 400);
    }

    const ctx = analysisContext as AnalysisContext;
    if (
      !ctx ||
      typeof ctx !== "object" ||
      (ctx.periodType !== "daily" && ctx.periodType !== "weekly") ||
      typeof ctx.totalMinutes !== "number" ||
      typeof ctx.detoxScore !== "number" ||
      !Array.isArray(ctx.apps) ||
      !Array.isArray(ctx.coreProblems)
    ) {
      throw apiError("analysisContext 형식이 올바르지 않습니다.", 400);
    }

    const history = (messages as ChatMessage[]).slice(0, -1);
    const lastMessage = (messages as ChatMessage[])[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user")
      throw apiError("마지막 메시지는 user 역할이어야 합니다.", 400);

    // Gemini history는 반드시 user role부터 시작해야 함
    const firstUserIdx = history.findIndex((m) => m.role === "user");
    const cleanHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : [];

    const model = getGeminiModel(buildChatSystemPrompt(ctx));
    const chat = model.startChat({
      history: cleanHistory.map((msg) => ({ role: msg.role, parts: [{ text: msg.text }] })),
    });

    const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
      [{ text: lastMessage.text }];

    // 이미지는 마지막(방금 보낸) 메시지에만 실려 온다 — 저장하지 않고 그대로 전달
    if (lastMessage.imageBase64) {
      assertInlineImage(lastMessage.imageBase64, lastMessage.mimeType);
      userParts.push({
        inlineData: {
          mimeType: lastMessage.mimeType as string,
          data: lastMessage.imageBase64,
        },
      });
    }

    const result = await chat.sendMessage(userParts);
    return Response.json({ reply: result.response.text().trim() });
  } catch (e) {
    return handleApiError(e);
  }
}
