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

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* 배지 이름 → 이모지 매핑 */
function badgeEmoji(name: string): string {
  const map: Record<string, string> = {
    "첫 분석": "🔍",
    "첫 디톡스": "🌱",
    "7일 연속": "🔥",
    "30일 연속": "💎",
    "디톡스 마스터": "🏆",
    "목표 달성": "🎯",
    "주간 분석 완료": "📊",
  };
  return map[name] ?? "🏅";
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
              획득한 배지 {loading ? "—" : `${badges.length}개`}
            </p>
          </div>
        </div>

        <div className="p-6 flex-1">
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl h-44 animate-pulse"
                  style={{ background: "var(--bg-bar)" }}
                />
              ))}
            </div>
          ) : badges.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="text-6xl">🏅</span>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                아직 획득한 배지가 없어요
              </p>
              <p className="text-sm text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
                AI 분석을 완료하고, 디톡스 세션을 달성하면<br />배지를 얻을 수 있어요.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {badges.map((badge) => (
                <Card key={badge.id} className="flex flex-col items-center text-center gap-3 py-6">
                  <span className="text-5xl">{badgeEmoji(badge.name)}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {badge.name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {fmtDate(badge.earnedAt)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
