import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/firebase-admin";
import { kstDayStart } from "@/lib/kst";

/**
 * 일간 분석 하루 1회 제한 (KST) — 오늘 저장된 일간 분석이 있으면 409를 던진다.
 *
 * 두 곳에서 부른다.
 * - `POST /api/ai/analyze` — **Gemini를 부르기 전에.** 저장 단계에서만 막으면 오늘 이미 분석한
 *   사용자도 AI를 계속 부를 수 있고(비용), 다른 기기에서 올린 사진은 최대 60초 분석한 뒤 저장에서 버려진다.
 * - `POST /api/analyses` — 저장 직전에. 두 기기가 동시에 AI 단계를 통과해도 여기서 한 번 더 막는다.
 *
 * 저장하지 않고 AI만 반복 호출하는 경우는 이 확인으로 막히지 않는다 — 사용자별 호출 횟수 제한은
 * 16단계(QA)에서 다룬다 (앱 TestFlight 배포 전).
 */
export async function assertDailyAnalysisAvailable(userId: string): Promise<void> {
  const existing = await prisma.analysis.findFirst({
    where: { userId, periodType: "daily", createdAt: { gte: kstDayStart() } },
    select: { id: true },
  });
  if (existing) {
    throw apiError("오늘은 이미 일간 분석을 완료했습니다. 일간 분석은 하루에 한 번만 가능합니다.", 409);
  }
}
