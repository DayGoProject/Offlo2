"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";

interface Badge {
  id: string;
  name: string;
  earnedAt: string;
  shared: boolean;
}

/* 획득 가능한 모든 배지 정의 */
const ALL_BADGES: { name: string; emoji: string; description: string }[] = [
  { name: "첫 분석",      emoji: "🔍", description: "처음으로 AI 스크린타임 분석을 완료했어요." },
  { name: "주간 분석 완료", emoji: "📊", description: "일간 분석 7회를 완료해 주간 분석을 생성했어요." },
  { name: "7일 연속",     emoji: "🔥", description: "7일 연속으로 AI 분석을 완료했어요." },
  { name: "목표 달성",    emoji: "🎯", description: "설정한 디지털 디톡스 목표를 달성했어요." },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {children}
    </div>
  );
}

export default function BadgesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const res = await fetch("/api/badges", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setBadges((await res.json()).badges ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || !user) return null;

  const earnedNames = new Set(badges.map((b) => b.name));
  const lockedBadges = ALL_BADGES.filter((b) => !earnedNames.has(b.name));

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="ml-56 flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-7 py-5 border-b"
          style={{ borderColor: "var(--border-card)" }}
        >
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              배지
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {loading ? "로딩 중…" : `${badges.length} / ${ALL_BADGES.length}개 획득`}
            </p>
          </div>
        </div>

        <div className="p-6 flex-1 space-y-8">

          {/* ── 획득한 배지 ── */}
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              획득한 배지
            </h2>

            {loading ? (
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl h-44 animate-pulse" style={{ background: "var(--bg-bar)" }} />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-5xl">🏅</span>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  아직 획득한 배지가 없어요
                </p>
                <p className="text-sm text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  AI 분석을 완료하고 목표를 달성하면<br />배지를 얻을 수 있어요.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {badges.map((badge) => {
                  const def = ALL_BADGES.find((b) => b.name === badge.name);
                  return (
                    <Card key={badge.id} className="flex flex-col items-center text-center gap-3 py-6">
                      <span className="text-5xl">{def?.emoji ?? "🏅"}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          {badge.name}
                        </p>
                        {def && (
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {def.description}
                          </p>
                        )}
                        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                          {fmtDate(badge.earnedAt)}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 획득 가능한 배지 ── */}
          {!loading && lockedBadges.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                획득 가능한 배지
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {lockedBadges.map((badge) => (
                  <div
                    key={badge.name}
                    className="rounded-2xl p-5 flex flex-col items-center text-center gap-3 py-6"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-card)",
                      opacity: 0.5,
                    }}
                  >
                    <div className="relative">
                      <span className="text-5xl grayscale">{badge.emoji}</span>
                      <span
                        className="absolute -bottom-1 -right-1 text-lg"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
                      >
                        🔒
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {badge.name}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
