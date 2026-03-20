"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import Navbar from "@/components/Navbar";

interface AppUsage {
  appName: string;
  minutes: number;
  category: string;
}

interface Analysis {
  totalMinutes: number;
  apps: AppUsage[];
  topCategories: { category: string; minutes: number }[];
  recommendations: string[];
  detoxScore: number;
  isPremium: boolean;
  createdAt: { seconds: number } | null;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "#3DDB87" : score >= 40 ? "#f0b429" : "#ff6b6b";
  const label = score >= 70 ? "건강한 사용" : score >= 40 ? "주의 필요" : "디톡스 필요";

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--score-track)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 264} 264`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-[1.8rem] font-extrabold leading-none" style={{ color }}>{score}</span>
        <span className="text-[0.65rem] text-black/50 dark:text-white/50 font-medium">{label}</span>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    async function fetchAnalysis() {
      try {
        const docRef = doc(db, "users", user!.uid, "analyses", id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError("분석 결과를 찾을 수 없습니다.");
        } else {
          setAnalysis(snap.data() as Analysis);
        }
      } catch {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setFetching(false);
      }
    }
    fetchAnalysis();
  }, [user, id]);

  if (loading || !user) return null;

  if (fetching) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <div className="max-w-md mx-auto mt-28 px-6 flex flex-col items-center gap-5">
            <div className="w-11 h-11 rounded-full border-[3px] border-brand/20 border-t-brand animate-spin" />
            <p className="text-black/50 dark:text-white/50 text-sm">결과를 불러오는 중...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !analysis) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <div className="max-w-md mx-auto mt-28 px-6 flex flex-col items-center gap-5">
            <p className="text-red-500 text-sm text-center">{error ?? "알 수 없는 오류가 발생했습니다."}</p>
            <Link href="/analysis" className="bg-brand text-[#0A0A0F] rounded-full px-7 py-3 font-bold text-sm">
              다시 분석하기
            </Link>
          </div>
        </main>
      </>
    );
  }

  const maxMinutes = Math.max(...analysis.apps.map((a) => a.minutes), 1);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <div className="max-w-2xl mx-auto px-6 py-12 pb-20 flex flex-col gap-10">

          {/* 상단 요약 */}
          <div className="flex items-center gap-8 bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-8 py-7 shadow-sm dark:shadow-none max-[560px]:flex-col max-[560px]:items-center max-[560px]:text-center max-[560px]:px-5 max-[560px]:py-6">
            <ScoreCircle score={analysis.detoxScore} />
            <div className="flex-1 flex flex-col gap-2.5">
              <h1 className="text-2xl font-extrabold text-[#0A0A0F] dark:text-white tracking-tight">분석 결과</h1>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-black/40 dark:text-white/40">오늘 총 스크린타임</span>
                <span className="text-2xl font-bold text-[#0A0A0F] dark:text-white">
                  {formatMinutes(analysis.totalMinutes)}
                </span>
              </div>
              {analysis.topCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-[560px]:justify-center">
                  {analysis.topCategories.slice(0, 3).map((cat) => (
                    <span key={cat.category} className="bg-brand/[0.08] border border-brand/20 text-brand rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {cat.category} · {formatMinutes(cat.minutes)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 앱별 사용 시간 */}
          <section className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">앱별 사용 시간</h2>
            <div className="flex flex-col gap-4">
              {analysis.apps.map((app, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-black/85 dark:text-white/85">{app.appName}</span>
                    <span className="text-sm font-semibold text-brand">{formatMinutes(app.minutes)}</span>
                  </div>
                  <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand to-brand/50 rounded-full transition-all duration-500"
                      style={{ width: `${(app.minutes / maxMinutes) * 100}%` }}
                    />
                  </div>
                  <span className="text-[0.72rem] text-black/30 dark:text-white/30">{app.category}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 디톡스 추천 */}
          <section className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">맞춤 디톡스 추천</h2>
            <div className="flex flex-col gap-3">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 shadow-sm dark:shadow-none">
                  <span className="w-7 h-7 min-w-7 rounded-full bg-brand/[0.12] text-brand text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-black/75 dark:text-white/75 leading-relaxed m-0">{rec}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 프리미엄 CTA */}
          {!analysis.isPremium && (
            <div className="bg-brand/[0.05] border border-brand/[0.18] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-black/65 dark:text-white/65 leading-relaxed m-0">
                📊 <strong className="text-brand">프리미엄</strong>으로 업그레이드하면 카테고리별 차트, 주간 트렌드, 목표 설정 기능을 사용할 수 있습니다.
              </p>
              <button className="bg-brand text-[#0A0A0F] rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer border-none whitespace-nowrap hover:opacity-90 transition-opacity">
                프리미엄 시작하기
              </button>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 max-[560px]:flex-col">
            <Link href="/analysis" className="bg-brand text-[#0A0A0F] rounded-full px-7 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity max-[560px]:text-center">
              새로운 분석하기
            </Link>
            <Link href="/dashboard" className="bg-transparent text-black/60 dark:text-white/60 border border-black/[0.12] dark:border-white/[0.12] rounded-full px-6 py-3.5 text-sm hover:text-black/90 dark:hover:text-white/90 hover:border-black/25 dark:hover:border-white/25 transition-all max-[560px]:text-center">
              대시보드 보기
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
