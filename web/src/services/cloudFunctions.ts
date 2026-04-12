import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/services/firebase";

const functions = getFunctions(app, "asia-northeast3");

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

/** generateWeeklyAnalysis 에 전달하는 일간 요약 */
export interface DailySummary {
  date: string;
  totalMinutes: number;
  apps: AppUsage[];
  detoxScore: number;
}

/** chatWithAnalysis 에 전달하는 분석 컨텍스트 */
export interface AnalysisContext {
  periodType: "daily" | "weekly";
  totalMinutes: number;
  apps: AppUsage[];
  detoxScore: number;
  coreProblems: string[];
}

/* ── Cloud Function 싱글톤 ──────────────────────────────────── */

export const analyzeScreenTime = httpsCallable<
  { storagePath: string },
  { analysisData: AnalysisResult }
>(functions, "analyzeScreenTime");

export const generateWeeklyAnalysis = httpsCallable<
  { dailySummaries: DailySummary[] },
  { analysisData: AnalysisResult }
>(functions, "generateWeeklyAnalysis");

export const chatWithAnalysis = httpsCallable<
  {
    analysisId: string;
    messages: { role: "user" | "model"; text: string; imagePath?: string }[];
    analysisContext: AnalysisContext;
  },
  { reply: string }
>(functions, "chatWithAnalysis");
