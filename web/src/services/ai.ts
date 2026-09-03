import { auth } from "@/services/firebase";

/**
 * AI 분석 API 클라이언트.
 * Gemini 호출은 전부 Next.js API Route(서버)에서만 수행한다 — 클라이언트는 이 파일을 통해서만 호출.
 */

/* ── 공유 타입 ─────────────────────────────────────────────── */

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

/** 주간 분석에 전달하는 일간 요약 */
export interface DailySummary {
  date: string;
  totalMinutes: number;
  apps: AppUsage[];
  detoxScore: number;
}

/** 채팅에 전달하는 분석 컨텍스트 */
export interface AnalysisContext {
  periodType: "daily" | "weekly";
  totalMinutes: number;
  apps: AppUsage[];
  detoxScore: number;
  coreProblems: string[];
}

export interface ChatMessagePayload {
  role: "user" | "model";
  text: string;
  /** 방금 보내는 메시지에만 포함한다 — 히스토리에 남기면 요청 본문이 불어난다 */
  imageBase64?: string;
  mimeType?: string;
}

/* ── 공통 호출 유틸 ─────────────────────────────────────────── */

async function postAi<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");

  const token = await user.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "AI 처리 중 오류가 발생했습니다.");
  }
  return res.json() as Promise<T>;
}

/* ── AI API ────────────────────────────────────────────────── */

/** 일간 스크린타임 이미지 분석 (압축한 이미지를 본문에 실어 전달) */
export function analyzeScreenTime(params: { imageBase64: string; mimeType: string }) {
  return postAi<{ analysisData: AnalysisResult }>("/api/ai/analyze", params);
}

/** 이번 주 일간 분석 7개를 종합한 주간 분석 */
export function generateWeeklyAnalysis(params: { dailySummaries: DailySummary[] }) {
  return postAi<{ analysisData: AnalysisResult }>("/api/ai/weekly", params);
}

/** 분석 결과 기반 AI 코치 채팅 */
export function chatWithAnalysis(params: {
  analysisId: string;
  messages: ChatMessagePayload[];
  analysisContext: AnalysisContext;
}) {
  return postAi<{ reply: string }>("/api/ai/chat", params);
}
