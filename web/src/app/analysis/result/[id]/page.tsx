"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import Navbar from "@/components/Navbar";
import s from "./result.module.css";

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
    <div className={s.scoreCircle}>
      <svg viewBox="0 0 100 100" className={s.scoreSvg}>
        <circle cx="50" cy="50" r="42" className={s.scoreBg} />
        <circle
          cx="50" cy="50" r="42"
          className={s.scoreFill}
          style={{
            stroke: color,
            strokeDasharray: `${(score / 100) * 264} 264`,
          }}
        />
      </svg>
      <div className={s.scoreInner}>
        <span className={s.scoreNumber} style={{ color }}>{score}</span>
        <span className={s.scoreLabel}>{label}</span>
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
    if (!loading && !user) {
      router.replace("/login");
    }
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
        <main className={s.main}>
          <div className={s.center}>
            <div className={s.spinner} />
            <p className={s.loadingText}>결과를 불러오는 중...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !analysis) {
    return (
      <>
        <Navbar />
        <main className={s.main}>
          <div className={s.center}>
            <p className={s.errorText}>{error ?? "알 수 없는 오류가 발생했습니다."}</p>
            <Link href="/analysis" className={s.retryButton}>다시 분석하기</Link>
          </div>
        </main>
      </>
    );
  }

  const maxMinutes = Math.max(...analysis.apps.map((a) => a.minutes), 1);

  return (
    <>
      <Navbar />
      <main className={s.main}>
        <div className={s.container}>
          {/* 상단 요약 */}
          <div className={s.summary}>
            <ScoreCircle score={analysis.detoxScore} />
            <div className={s.summaryInfo}>
              <h1 className={s.title}>분석 결과</h1>
              <div className={s.totalTime}>
                <span className={s.totalLabel}>오늘 총 스크린타임</span>
                <span className={s.totalValue}>{formatMinutes(analysis.totalMinutes)}</span>
              </div>
              {analysis.topCategories.length > 0 && (
                <div className={s.topCats}>
                  {analysis.topCategories.slice(0, 3).map((cat) => (
                    <span key={cat.category} className={s.catChip}>
                      {cat.category} · {formatMinutes(cat.minutes)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 앱별 사용 시간 */}
          <section className={s.section}>
            <h2 className={s.sectionTitle}>앱별 사용 시간</h2>
            <div className={s.appList}>
              {analysis.apps.map((app, i) => (
                <div key={i} className={s.appRow}>
                  <div className={s.appHeader}>
                    <span className={s.appName}>{app.appName}</span>
                    <span className={s.appTime}>{formatMinutes(app.minutes)}</span>
                  </div>
                  <div className={s.barTrack}>
                    <div
                      className={s.barFill}
                      style={{ width: `${(app.minutes / maxMinutes) * 100}%` }}
                    />
                  </div>
                  <span className={s.appCategory}>{app.category}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 디톡스 추천 */}
          <section className={s.section}>
            <h2 className={s.sectionTitle}>맞춤 디톡스 추천</h2>
            <div className={s.recommendations}>
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className={s.recCard}>
                  <span className={s.recNum}>{i + 1}</span>
                  <p className={s.recText}>{rec}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 프리미엄 CTA */}
          {!analysis.isPremium && (
            <div className={s.premiumBanner}>
              <p className={s.premiumText}>
                📊 <strong>프리미엄</strong>으로 업그레이드하면 카테고리별 차트, 주간 트렌드, 목표 설정 기능을 사용할 수 있습니다.
              </p>
              <button className={s.premiumButton}>프리미엄 시작하기</button>
            </div>
          )}

          <div className={s.actions}>
            <Link href="/analysis" className={s.analyzeAgainButton}>
              새로운 분석하기
            </Link>
            <Link href="/dashboard" className={s.dashboardButton}>
              대시보드 보기
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
