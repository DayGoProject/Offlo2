"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import { db } from "@/services/firebase";
import AppSidebar from "@/components/AppSidebar";
import { getPlantLevel, getAnimalStage, getAnimalEmoji, type AnimalTypeId } from "@/lib/garden-utils";

/* ── 타입 ─────────────────────────────────────────────────────── */

interface Analysis {
  id: string;
  periodType: "daily" | "weekly";
  totalMinutes: number;
  detoxScore: number;
  createdAt: string;
}

interface Goal {
  id: string;
  title: string;
  targetMinutes: number;
  endDate: string;
}

interface WeekPoint {
  day: string;
  minutes: number;
  isToday: boolean;
}

/* ── 유틸 ─────────────────────────────────────────────────────── */

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function relDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildWeekData(analyses: Analysis[]): WeekPoint[] {
  const DAY = ["일", "월", "화", "수", "목", "금", "토"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const match = analyses
      .filter((a) => a.periodType === "daily")
      .find((a) => a.createdAt.slice(0, 10) === dateStr);
    return { day: DAY[d.getDay()], minutes: match?.totalMinutes ?? 0, isToday: i === 6 };
  });
}

/* ── SVG: 동심 링 차트 ─────────────────────────────────────────── */

function RingChart({ score, screenRatio, size = 164 }: { score: number; screenRatio: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;

  const or = size / 2 - 13; // outer radius
  const ir = size / 2 - 34; // inner radius
  const oc = 2 * Math.PI * or;
  const ic = 2 * Math.PI * ir;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={or} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="11" />
      <circle
        cx={cx} cy={cy} r={or} fill="none"
        stroke="#3DDB87" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={oc} strokeDashoffset={oc * (1 - Math.min(score / 100, 1))}
      />
      <circle cx={cx} cy={cy} r={ir} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
      <circle
        cx={cx} cy={cy} r={ir} fill="none"
        stroke="rgba(61,219,135,0.45)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={ic} strokeDashoffset={ic * (1 - Math.min(screenRatio, 1))}
      />
    </svg>
  );
}

/* ── SVG: 반원 게이지 ──────────────────────────────────────────── */

function GaugeArc({ value, max, size = 220 }: { value: number; max: number; size?: number }) {
  const cx = size / 2;
  const cy = size * 0.56;
  const r = size * 0.38;
  const sw = 13;
  const len = Math.PI * r;
  const offset = len * (1 - Math.min(value / max, 1));

  const sx = cx - r; const sy = cy;
  const ex = cx + r; const ey = cy;

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 0 ${ex} ${ey}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} strokeLinecap="round" />
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 0 ${ex} ${ey}`}
        fill="none" stroke="#3DDB87" strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={offset} />
    </svg>
  );
}

/* ── Recharts 커스텀 툴팁 ──────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ background: "#1a1a26", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p className="font-bold text-brand mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

/* ── 카드 래퍼 ─────────────────────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
      {children}
    </div>
  );
}

/* ── 스켈레톤 ──────────────────────────────────────────────────── */

function Skeleton({ h = "h-4", w = "w-full", className = "" }: { h?: string; w?: string; className?: string }) {
  return <div className={`${h} ${w} rounded-lg animate-pulse ${className}`} style={{ background: "var(--bg-bar)" }} />;
}

/* ── 메인 페이지 ───────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [detoxMin, setDetoxMin] = useState<number | null>(null);
  const [animalData, setAnimalData] = useState<{ type: AnimalTypeId | null; streak: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [gardenTab, setGardenTab] = useState<"plant" | "animal">("plant");
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const h = { Authorization: `Bearer ${token}` };
      const [aRes, gRes, plantSnap, animalSnap] = await Promise.all([
        fetch("/api/analyses?limit=10", { headers: h }),
        fetch("/api/goals?status=active", { headers: h }),
        getDoc(doc(db, "users", user.uid, "garden", "plant")),
        getDoc(doc(db, "users", user.uid, "garden", "animal")),
      ]);
      if (aRes.ok) setAnalyses((await aRes.json()).analyses ?? []);
      if (gRes.ok) setGoals((await gRes.json()).goals ?? []);
      setDetoxMin(plantSnap.exists() ? (plantSnap.data()?.totalDetoxMinutes ?? 0) : 0);
      if (animalSnap.exists()) {
        const d = animalSnap.data();
        setAnimalData({ type: d.type ?? null, streak: d.streak ?? 0 });
      }
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || !user) return null;

  const plantLevel = getPlantLevel(detoxMin ?? 0);
  const animalEmoji = animalData ? getAnimalEmoji(animalData.type, animalData.streak) : "🥚";
  const animalStage = getAnimalStage(animalData?.streak ?? 0);

  const latest = analyses[0] ?? null;
  const latestDaily = analyses.find((a) => a.periodType === "daily") ?? null;
  const weekData = buildWeekData(analyses);
  const maxMin = Math.max(...weekData.map((d) => d.minutes), 120);
  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "사용자";
  const gaugeMax = Math.max(detoxMin ?? 0, 60);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="ml-56 flex-1 flex flex-col min-h-screen overflow-x-hidden">

        {/* ── 상단 스탯 바 ── */}
        <div className="flex items-center justify-between px-7 py-4 border-b"
          style={{ borderColor: "var(--border-card)" }}>
          <div className="flex items-center gap-7">
            {[
              { label: "누적 디톡스", value: detoxMin === null ? "—" : fmt(detoxMin) },
              { label: "오늘 스크린타임", value: latestDaily ? fmt(latestDaily.totalMinutes) : "—" },
              { label: "총 분석 횟수", value: loading ? "—" : `${analyses.length}회` },
              { label: "최근 점수", value: latest ? `${latest.detoxScore}점` : "—" },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className="flex items-center gap-7">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                  {loading ? (
                    <Skeleton h="h-6" w="w-20" />
                  ) : (
                    <p className="text-lg font-extrabold tracking-tight text-brand">{value}</p>
                  )}
                </div>
                {i < arr.length - 1 && (
                  <div className="w-px h-8 flex-shrink-0" style={{ background: "var(--border-card)" }} />
                )}
              </div>
            ))}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.05] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-brand text-sm font-bold">{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {displayName}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ color: "var(--text-muted)", transform: profileOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-40 rounded-xl overflow-hidden z-50 shadow-lg"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
              >
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.05]"
                  style={{ color: "var(--text-primary)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  설정
                </Link>
                <div style={{ height: "1px", background: "var(--border-card)" }} />
                <button
                  onClick={async () => { setProfileOpen(false); await logout(); router.push("/"); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.05] text-red-400"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 카드 그리드 ── */}
        <div className="p-6 flex-1 space-y-4">

          {/* 1행: 오늘 분석 | 주간 차트 | 최근 기록 */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 272px" }}>

            {/* 오늘 분석 — 링 차트 */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>오늘 분석</h3>
                {latestDaily && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {relDate(latestDaily.createdAt)}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-44">
                  <div className="w-9 h-9 rounded-full border-2 border-t-brand animate-spin"
                    style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }} />
                </div>
              ) : latestDaily ? (
                <div className="flex items-center gap-5">
                  <div className="relative flex-shrink-0" style={{ width: 164, height: 164 }}>
                    <RingChart
                      score={latestDaily.detoxScore}
                      screenRatio={latestDaily.totalMinutes / 480}
                      size={164}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-brand leading-none">
                        {latestDaily.detoxScore}
                      </span>
                      <span className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>점</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand" />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>디톡스 점수</span>
                      </div>
                      <p className="text-2xl font-extrabold text-brand pl-[18px]">
                        {latestDaily.detoxScore}%
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(61,219,135,0.45)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>스크린타임</span>
                      </div>
                      <p className="text-2xl font-extrabold pl-[18px]" style={{ color: "var(--text-primary)" }}>
                        {Math.round(Math.min(latestDaily.totalMinutes / 480, 1) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 gap-3">
                  <span className="text-4xl">📱</span>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>분석 기록이 없어요</p>
                  <Link href="/analysis" className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity">
                    분석 시작하기 →
                  </Link>
                </div>
              )}
            </Card>

            {/* 주간 스크린타임 — 바 차트 */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>주간 스크린타임</h3>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>최근 7일</span>
              </div>

              <div style={{ height: 172 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekData} barSize={22} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
                      axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => v === 0 ? "" : `${Math.floor(v / 60)}h`}
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                      axisLine={false} tickLine={false} domain={[0, maxMin]} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                    <Bar dataKey="minutes" radius={[5, 5, 0, 0]}>
                      {weekData.map((d, i) => (
                        <Cell key={i}
                          fill={d.isToday ? "#3DDB87" : d.minutes > 0 ? "rgba(61,219,135,0.3)" : "rgba(255,255,255,0.04)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-4 mt-3">
                {[
                  { color: "#3DDB87", label: "오늘" },
                  { color: "rgba(61,219,135,0.3)", label: "분석 있음" },
                  { color: "rgba(255,255,255,0.08)", label: "데이터 없음" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 최근 기록 */}
            <Card className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>최근 기록</h3>
                <Link href="/analysis" className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity">
                  분석 시작 →
                </Link>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 218 }}>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h="h-12" />)
                ) : analyses.length === 0 ? (
                  <p className="text-xs text-center py-10" style={{ color: "var(--text-muted)" }}>기록 없음</p>
                ) : (
                  analyses.slice(0, 7).map((a) => (
                    <Link key={a.id} href={`/analysis/result/${a.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.04]"
                      style={{ background: "var(--bg-subtle)" }}>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          {a.periodType === "weekly" ? "주간" : "일간"} · {relDate(a.createdAt)}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {fmt(a.totalMinutes)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-base font-extrabold ${
                          a.detoxScore >= 70 ? "text-brand" : a.detoxScore >= 40 ? "text-yellow-400" : "text-red-400"
                        }`}>
                          {a.detoxScore}
                        </span>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>점</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* 2행: 디톡스 게이지 | 활성 목표 | 정원 */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 272px 220px" }}>

            {/* 누적 디톡스 — 게이지 + 통계 */}
            <Card>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                누적 디톡스 현황
              </h3>
              <div className="flex items-center gap-8">
                <div className="relative flex-shrink-0">
                  <GaugeArc value={detoxMin ?? 0} max={gaugeMax} size={220} />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-1">
                    <p className="text-3xl font-extrabold text-brand leading-none">
                      {detoxMin === null ? "—" : fmt(detoxMin)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>총 디톡스 시간</p>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Offlo 확장 프로그램으로 디톡스 세션을 완료하면 시간이 자동으로 적립됩니다.
                    세션 중 차단된 사이트 접근을 참으면 반려 식물이 자라요.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "최근 분석 점수", value: latest ? `${latest.detoxScore}점` : "—" },
                      { label: "총 분석 횟수",   value: loading ? "—" : `${analyses.length}회` },
                      { label: "활성 목표",      value: loading ? "—" : `${goals.length}개` },
                      { label: "주간 분석",      value: loading ? "—" : `${analyses.filter(a => a.periodType === "weekly").length}회` },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-3 py-2.5 rounded-xl"
                        style={{ background: "var(--bg-subtle)" }}>
                        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                        <p className="text-sm font-bold text-brand">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 활성 목표 */}
            <Card className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>활성 목표</h3>
                <Link href="/goals" className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity">
                  전체 보기 →
                </Link>
              </div>

              <div className="flex-1 space-y-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h="h-14" />)
                ) : goals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <span className="text-3xl">🎯</span>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>진행 중인 목표 없음</p>
                  </div>
                ) : (
                  goals.slice(0, 3).map((g) => (
                    <div key={g.id} className="px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--bg-subtle)" }}>
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {g.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        목표 {fmt(g.targetMinutes)}/일 · ~{new Date(g.endDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <Link href="/goals"
                className="mt-4 block w-full text-center py-2.5 rounded-xl text-sm font-bold text-brand transition-colors hover:bg-brand/10"
                style={{ border: "1px solid rgba(61,219,135,0.25)" }}>
                목표 관리하기
              </Link>
            </Card>

            {/* 정원 미니 위젯 */}
            <Card className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>정원</h3>
                <Link href="/garden" className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity">
                  정원 보기 →
                </Link>
              </div>

              {/* 탭 */}
              <div className="flex rounded-lg p-0.5 mb-4" style={{ background: "var(--bg-subtle)" }}>
                {(["plant", "animal"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGardenTab(tab)}
                    className="flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors cursor-pointer"
                    style={gardenTab === tab
                      ? { background: "var(--bg-card)", color: "var(--text-primary)" }
                      : { color: "var(--text-muted)" }}
                  >
                    {tab === "plant" ? "🌱 식물" : "🐾 동물"}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-2">
                {gardenTab === "plant" ? (
                  <>
                    <span className="text-5xl">{plantLevel.emoji}</span>
                    <p className="text-xs font-bold text-brand">Lv.{plantLevel.level} {plantLevel.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(detoxMin ?? 0)} 적립</p>
                  </>
                ) : (
                  <>
                    <span className="text-5xl">{animalEmoji}</span>
                    {animalData?.type ? (
                      <>
                        <p className="text-xs font-bold text-brand">{animalStage.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          🔥 {animalData.streak}일 연속 기록
                        </p>
                      </>
                    ) : (
                      <Link href="/garden" className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity">
                        동물 선택하기 →
                      </Link>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
