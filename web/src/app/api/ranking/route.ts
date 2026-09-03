import { handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/social";

/* ── GET /api/ranking — 주간 디톡스 랭킹 ───────────────────── */
// 기준: 최근 7일 일간 분석의 디톡스 점수 평균.
// 분석 3회 미만은 제외 — 단 1회 고득점으로 상위권에 오르는 것을 막는다.

const RANKING_DAYS = 7;
const MIN_ANALYSES = 3;
const TOP_N = 10;

export async function GET(req: Request): Promise<Response> {
  try {
    const { userId } = await requireUser(req);

    const since = new Date(Date.now() - RANKING_DAYS * 24 * 60 * 60 * 1000);

    const grouped = await prisma.analysis.groupBy({
      by: ["userId"],
      where: { periodType: "daily", createdAt: { gte: since } },
      _avg: { detoxScore: true },
      _count: { _all: true },
    });

    const ranked = grouped
      .filter((g) => g._count._all >= MIN_ANALYSES)
      .map((g) => ({
        userId: g.userId,
        avgScore: Math.round(g._avg.detoxScore ?? 0),
        analysisCount: g._count._all,
      }))
      .sort((a, b) => b.avgScore - a.avgScore || b.analysisCount - a.analysisCount);

    const myIndex = ranked.findIndex((r) => r.userId === userId);
    const top = ranked.slice(0, TOP_N);

    // 이름은 상위권 + 본인 것만 조회한다 (전체 유저를 읽지 않는다)
    const needed = new Set(top.map((r) => r.userId));
    if (myIndex >= 0) needed.add(userId);

    const users = await prisma.user.findMany({
      where: { id: { in: [...needed] } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.name]));

    const toEntry = (r: (typeof ranked)[number], i: number) => ({
      rank: i + 1,
      name: nameOf.get(r.userId) ?? "알 수 없음",
      avgScore: r.avgScore,
      analysisCount: r.analysisCount,
      isMe: r.userId === userId,
    });

    return Response.json({
      ranking: top.map(toEntry),
      // 본인이 Top 10 밖이면 내 순위를 따로 내려준다 (없으면 null)
      myRank: myIndex >= 0 ? toEntry(ranked[myIndex]!, myIndex) : null,
      minAnalyses: MIN_ANALYSES,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
