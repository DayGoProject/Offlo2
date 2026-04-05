import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/services/firebase";

const functions = getFunctions(app, "asia-northeast3");

export const analyzeScreenTime = httpsCallable<
  { storagePath: string },
  { analysisId: string }
>(functions, "analyzeScreenTime");

export const generateWeeklyAnalysis = httpsCallable<
  Record<string, never>,
  { analysisId: string }
>(functions, "generateWeeklyAnalysis");

export const chatWithAnalysis = httpsCallable<
  {
    analysisId: string;
    messages: { role: "user" | "model"; text: string; imagePath?: string }[];
  },
  { reply: string }
>(functions, "chatWithAnalysis");
