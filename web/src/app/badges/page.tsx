"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import Modal from "@/components/app/Modal";
import Field, { ErrorNote, inputStyle } from "@/components/app/Field";
import BadgeIcon from "@/components/app/BadgeIcon";
import { fmtDate } from "@/lib/format";
import { ALL_BADGES, getBadgeDef, type BadgeDef } from "@/lib/badge-utils";
import { shareBadge, MAX_POST_LENGTH } from "@/services/community";

interface Badge {
  id: string;
  name: string;
  earnedAt: string;
  shared: boolean;
}

interface Analysis {
  periodType: "daily" | "weekly";
  createdAt: string;
}

/** 잠긴 배지의 진행도 — 0~1과 남은 만큼을 설명하는 한 줄 */
function lockedProgress(
  name: string,
  s: { total: number; weekly: number; dailyThisWeek: number; streak: number },
): { ratio: number; note: string } {
  switch (name) {
    case "첫 분석":
      return { ratio: Math.min(1, s.total), note: "AI 분석 1회면 획득" };
    case "주간 분석 완료":
      return {
        ratio: Math.min(1, s.dailyThisWeek / 7),
        note: `이번 주 일간 분석 ${s.dailyThisWeek} / 7회`,
      };
    case "7일 연속":
      return {
        ratio: Math.min(1, s.streak / 7),
        note: s.streak > 0 ? `${7 - s.streak}일 더 이어가면 획득` : "연속 기록을 시작해 보세요",
      };
    case "목표 달성":
      return { ratio: 0, note: "목표를 하나 완료하면 획득" };
    default:
      return { ratio: 0, note: getBadgeDef(name)?.requirement ?? "" };
  }
}

export default function BadgesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState({ total: 0, weekly: 0, dailyThisWeek: 0, streak: 0 });
  const [loading, setLoading] = useState(true);

  /* 배지 자랑하기 (11단계) */
  const [shareTarget, setShareTarget] = useState<Badge | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const h = { Authorization: `Bearer ${token}` };
        // 잠긴 배지의 진행도를 채우려면 분석 횟수와 연속 기록이 필요하다
        const [bRes, aRes, animalSnap] = await Promise.all([
          fetch("/api/badges", { headers: h }),
          fetch("/api/analyses?limit=100", { headers: h }),
          getDoc(doc(db, "users", user.uid, "garden", "animal")),
        ]);

        if (bRes.ok) setBadges((await bRes.json()).badges ?? []);

        const list: Analysis[] = aRes.ok ? ((await aRes.json()).analyses ?? []) : [];
        const monday = new Date();
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);

        setStats({
          total: list.length,
          weekly: list.filter((a) => a.periodType === "weekly").length,
          dailyThisWeek: list.filter(
            (a) => a.periodType === "daily" && new Date(a.createdAt) >= monday,
          ).length,
          streak: animalSnap.exists() ? (animalSnap.data()?.streak ?? 0) : 0,
        });
      } catch (e) {
        // 실패해도 스켈레톤이 영원히 남지 않도록 finally에서 반드시 푼다
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleShare() {
    if (!shareTarget || sharing) return;
    setSharing(true);
    setShareError("");
    try {
      await shareBadge(shareTarget.id, shareMsg.trim());
      setBadges((prev) => prev.map((b) => (b.id === shareTarget.id ? { ...b, shared: true } : b)));
      setShareTarget(null);
      setShareMsg("");
      router.push("/community");
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "공유하지 못했습니다.");
    } finally {
      setSharing(false);
    }
  }

  if (authLoading || !user) return null;

  const earnedNames = new Set(badges.map((b) => b.name));
  const locked: BadgeDef[] = ALL_BADGES.filter((b) => !earnedNames.has(b.name));

  return (
    <AppShell>
      <PageHeader
        eyebrow={loading ? "불러오는 중" : `${badges.length}개 획득 · ${locked.length}개 남음`}
        title="배지"
        actions={
          <Pill href="/community" variant="primary">
            커뮤니티 가기
          </Pill>
        }
      />

      {/* ── 획득한 배지 ── */}
      <section className="flex flex-col gap-3.5 w-full">
        <h2
          className="text-[11px] leading-[14px] font-semibold"
          style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
        >
          획득한 배지
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[195px] rounded-card animate-pulse" style={{ background: "var(--bg-bar)" }} />
            ))}
          </div>
        ) : badges.length === 0 ? (
          <div
            className="flex flex-col gap-1.5 w-full px-[22px] sm:px-7 py-8 rounded-card"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
          >
            <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>
              아직 획득한 배지가 없어요
            </p>
            <p className="text-[13px] leading-5" style={{ color: "var(--text-muted)" }}>
              분석을 한 번만 올려도 첫 배지가 열립니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {badges.map((b) => {
              const def = getBadgeDef(b.name);
              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-3.5 px-6 py-[22px] rounded-card"
                  style={{ background: "var(--bg-card)", border: "1px solid rgba(61,219,135,0.2)" }}
                >
                  {def && <BadgeIcon badge={def} />}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <p className="text-[15px] leading-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {b.name}
                    </p>
                    <p className="num text-xs leading-4" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
                      {fmtDate(b.earnedAt)}
                      <span className="font-sans"> 획득</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShareTarget(b);
                      setShareMsg("");
                      setShareError("");
                    }}
                    disabled={b.shared}
                    className="flex items-center justify-center w-full h-[34px] rounded-full text-xs font-medium shrink-0 transition-opacity hover:opacity-75 disabled:opacity-45 disabled:cursor-default cursor-pointer"
                    style={{
                      border: "1px solid var(--border-strong)",
                      color: b.shared ? "var(--text-muted)" : "var(--text-primary)",
                    }}
                  >
                    {b.shared ? "공유함" : "자랑하기"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 잠긴 배지 ── */}
      {!loading && locked.length > 0 && (
        <section className="flex flex-col gap-3.5 w-full">
          <h2
            className="text-[11px] leading-[14px] font-semibold"
            style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
          >
            아직 잠긴 배지
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {locked.map((b) => {
              const { ratio, note } = lockedProgress(b.name, stats);
              return (
                <div
                  key={b.name}
                  className="flex flex-col gap-3.5 px-6 py-[22px] rounded-card"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
                >
                  <BadgeIcon badge={b} locked />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <p className="text-[15px] leading-[18px] font-semibold" style={{ color: "var(--text-faint)" }}>
                      {b.name}
                    </p>
                    <p className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
                      {note}
                    </p>
                  </div>
                  <div className="h-[5px] w-full rounded-full shrink-0" style={{ background: "var(--score-track)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ background: "rgba(61,219,135,0.4)", width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 자랑하기 모달 ── */}
      <Modal open={!!shareTarget} onClose={() => setShareTarget(null)} title="배지 자랑하기">
        {shareTarget && (
          <div className="flex flex-col gap-5">
            <div
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-lg"
              style={{ background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.2)" }}
            >
              {getBadgeDef(shareTarget.name) && <BadgeIcon badge={getBadgeDef(shareTarget.name)!} />}
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  커뮤니티에 공유할 배지
                </p>
                <p className="text-[15px] leading-[18px] font-semibold truncate" style={{ color: "var(--color-bloom)" }}>
                  {shareTarget.name}
                </p>
              </div>
            </div>

            <Field label="한마디 (선택)" hint="커뮤니티 피드에 이름과 함께 공개됩니다.">
              <textarea
                value={shareMsg}
                onChange={(e) => setShareMsg(e.target.value)}
                maxLength={MAX_POST_LENGTH}
                rows={3}
                placeholder="예: 드디어 7일 연속 달성했어요!"
                className="w-full px-3.5 py-3 rounded-lg text-sm outline-none resize-none transition-colors focus:border-[color:var(--color-bloom)]"
                style={inputStyle}
              />
            </Field>

            <ErrorNote>{shareError}</ErrorNote>

            <Pill onClick={handleShare} disabled={sharing} variant="accent" className="w-full">
              {sharing ? "공유 중…" : "커뮤니티에 공유"}
            </Pill>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
