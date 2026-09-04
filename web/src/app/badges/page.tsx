"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import Card from "@/components/ui/Card";
import { fmtDate } from "@/lib/format";
import { ALL_BADGES, getBadgeEmoji } from "@/lib/badge-utils";
import { shareBadge, MAX_POST_LENGTH } from "@/services/community";

interface Badge {
  id: string;
  name: string;
  earnedAt: string;
  shared: boolean;
}


export default function BadgesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  /* 배지 자랑하기 (11단계) */
  const [shareTarget, setShareTarget] = useState<Badge | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");

  async function handleShare() {
    if (!shareTarget || sharing) return;
    setSharing(true);
    setShareError("");
    try {
      await shareBadge(shareTarget.id, shareMsg.trim());
      setBadges((prev) =>
        prev.map((b) => (b.id === shareTarget.id ? { ...b, shared: true } : b))
      );
      setShareTarget(null);
      setShareMsg("");
      router.push("/community");
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "공유하지 못했습니다.");
    } finally {
      setSharing(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/badges", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setBadges((await res.json()).badges ?? []);
      } catch (e) {
        // 실패해도 스켈레톤이 영원히 남지 않도록 finally에서 반드시 푼다
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading || !user) return null;

  const earnedNames = new Set(badges.map((b) => b.name));
  const lockedBadges = ALL_BADGES.filter((b) => !earnedNames.has(b.name));

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="lg:ml-56 pt-14 lg:pt-0 flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 sm:px-7 py-4 sm:py-5 border-b"
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

        <div className="p-4 sm:p-6 flex-1 space-y-8">

          {/* ── 획득한 배지 ── */}
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              획득한 배지
            </h2>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

                      <button
                        onClick={() => {
                          setShareTarget(badge);
                          setShareMsg("");
                          setShareError("");
                        }}
                        disabled={badge.shared}
                        className="mt-auto px-3.5 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-45"
                        style={{
                          background: badge.shared ? "var(--bg-subtle)" : "rgba(61,219,135,0.10)",
                          border: `1px solid ${badge.shared ? "var(--border-card)" : "rgba(61,219,135,0.25)"}`,
                          color: badge.shared ? "var(--text-muted)" : "#3DDB87",
                        }}
                      >
                        {badge.shared ? "공유함" : "자랑하기"}
                      </button>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* ── 배지 자랑하기 모달 ── */}
      {shareTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShareTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              boxShadow: "var(--shadow-card)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold" style={{ color: "var(--text-primary)" }}>
                배지 자랑하기
              </h2>
              <button
                onClick={() => setShareTarget(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors hover:bg-white/[0.06]"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
              style={{ background: "rgba(61,219,135,0.08)", border: "1px solid rgba(61,219,135,0.2)" }}
            >
              <span className="text-2xl">{getBadgeEmoji(shareTarget.name)}</span>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>커뮤니티에 공유할 배지</p>
                <p className="text-sm font-bold" style={{ color: "#3DDB87" }}>{shareTarget.name}</p>
              </div>
            </div>

            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              한마디 (선택)
            </label>
            <textarea
              value={shareMsg}
              onChange={(e) => setShareMsg(e.target.value)}
              maxLength={MAX_POST_LENGTH}
              rows={3}
              placeholder="예: 드디어 7일 연속 달성했어요!"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-card)",
                color: "var(--text-primary)",
              }}
            />

            <p className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
              커뮤니티 피드에 이름과 함께 공개됩니다.
            </p>

            {shareError && (
              <p className="mt-2 text-xs" style={{ color: "#f87171" }}>{shareError}</p>
            )}

            <button
              onClick={handleShare}
              disabled={sharing}
              className="mt-5 w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: "#3DDB87", color: "#0A0A0F" }}
            >
              {sharing ? "공유 중…" : "커뮤니티에 공유"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
