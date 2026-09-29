import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/firebase-admin";
import { kstDayStart, kstWeekStart } from "@/lib/kst";

/**
 * AI 분석 횟수 제한 (KST) — **Gemini를 부르기 전에도, 저장하기 전에도** 같은 확인을 한다.
 *
 * 저장 단계에서만 막으면 ① 이미 분석한 사용자도 AI를 계속 부를 수 있고(비용) ② 다른 기기에서 먼저 분석했으면
 * 최대 60초 분석한 뒤 저장에서 버려진다. 두 기기가 동시에 AI 단계를 통과해도 저장 단계가 한 번 더 막는다.
 *
 * 저장하지 않고 AI만 반복 호출하는 경우는 이 확인으로 막히지 않는다 — 사용자별 호출 횟수 제한은
 * 16단계(QA)에서 다룬다 (앱 TestFlight 배포 전).
 */

/** 일간 분석 하루 1회 — `POST /api/ai/analyze` · `POST /api/analyses` */
export async function assertDailyAnalysisAvailable(userId: string): Promise<void> {
  const existing = await prisma.analysis.findFirst({
    where: { userId, periodType: "daily", createdAt: { gte: kstDayStart() } },
    select: { id: true },
  });
  if (existing) {
    throw apiError("오늘은 이미 일간 분석을 완료했습니다. 일간 분석은 하루에 한 번만 가능합니다.", 409);
  }
}

/**
 * 주간 분석 한 주 1회 (KST 월요일 0시 기준) — `POST /api/ai/weekly` · `POST /api/analyses`.
 * 주간은 일간 7개가 모여야 열리지만, 서버가 막지 않으면 같은 주에 몇 번이고 다시 만들 수 있었다 (Gemini 비용).
 */
export async function assertWeeklyAnalysisAvailable(userId: string): Promise<void> {
  const existing = await prisma.analysis.findFirst({
    where: { userId, periodType: "weekly", createdAt: { gte: kstWeekStart() } },
    select: { id: true },
  });
  if (existing) {
    throw apiError("이번 주 종합 분석을 이미 받았습니다. 주간 분석은 한 주에 한 번만 가능합니다.", 409);
  }
}
