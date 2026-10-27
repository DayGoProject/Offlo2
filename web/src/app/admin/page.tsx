"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import { ErrorNote } from "@/components/app/Field";
import { ReportCard, SanctionRow } from "@/components/admin/ModerationCards";
import { NotAdminError, deleteReported, dismissReport, fetchQueue, fetchSanctions, liftSanction, type ActiveSanction, type QueueItem } from "@/services/admin";

/**
 * 관리자 — 신고 처리 (M9). 서버가 관리자(`ADMIN_UIDS`)가 아니면 404를 주므로 이 화면도 없는 페이지처럼 보인다.
 * 신고 큐(숨겨진 것 · 신고 많은 것 먼저)에서 글 · 댓글을 보고 기각하거나, 지우면서 작성자에게 경고 / 커뮤니티 정지 / 계정 영구 정지를 준다.
 * 신고 수만으로 자동 제재하지 않는다 — 제재는 여기서 사람이 정한다. 카드는 `components/admin/ModerationCards.tsx`(서버를 부르지 않는다).
 */

type Tab = "reports" | "sanctions";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("reports");
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [sanctions, setSanctions] = useState<ActiveSanction[] | null>(null);
  const [error, setError] = useState("");
  const [notAdmin, setNotAdmin] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async (which: Tab) => {
    setError("");
    try {
      if (which === "reports") setItems(await fetchQueue());
      else setSanctions(await fetchSanctions());
    } catch (e) {
      if (e instanceof NotAdminError) setNotAdmin(true);
      else setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    if (user) void load(tab);
  }, [user, tab, load]);

  if (notAdmin) notFound();
  if (authLoading || !user) return null;

  /** 처리를 마치면 안내를 띄우고 두 목록을 다시 읽는다 */
  const done = (message: string) => {
    setFlash(message);
    void load("reports");
    void load("sanctions");
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="관리자"
        title="신고 처리"
        actions={
          <div className="flex gap-2">
            <Pill variant={tab === "reports" ? "accent" : "ghost"} onClick={() => setTab("reports")}>
              신고 큐{items ? ` ${items.length}` : ""}
            </Pill>
            <Pill variant={tab === "sanctions" ? "accent" : "ghost"} onClick={() => setTab("sanctions")}>
              제재 중{sanctions ? ` ${sanctions.length}` : ""}
            </Pill>
          </div>
        }
      />

      {flash ? (
        <p role="status" data-testid="admin-flash" className="text-xs leading-4 px-3 py-2.5 rounded-lg" style={{ color: "var(--color-bloom)", background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.2)" }}>
          {flash}
        </p>
      ) : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {tab === "reports" ? (
        items === null ? (
          error ? null : <p style={{ color: "var(--text-muted)" }}>불러오는 중…</p>
        ) : items.length === 0 ? (
          <p data-testid="admin-empty" className="text-sm" style={{ color: "var(--text-muted)" }}>
            처리할 신고가 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              신고가 3명이 되면 확인 전에도 다른 이용자에게 숨겨집니다. 제재는 자동으로 내려가지 않아요 — 여기서 정해 주세요.
            </p>
            {items.map((item) => (
              <ReportCard
                key={item.key}
                item={item}
                onDelete={async (sanction) => {
                  await deleteReported(item.targetType, item.targetId, sanction);
                  done(`${item.targetType === "post" ? "글" : "댓글"}을 지웠어요.`);
                }}
                onDismiss={async () => {
                  await dismissReport(item.targetType, item.targetId);
                  done("신고를 기각했어요. 숨김이 풀립니다.");
                }}
              />
            ))}
          </div>
        )
      ) : sanctions === null ? (
        error ? null : <p style={{ color: "var(--text-muted)" }}>불러오는 중…</p>
      ) : sanctions.length === 0 ? (
        <p data-testid="admin-empty" className="text-sm" style={{ color: "var(--text-muted)" }}>
          제재 중인 사용자가 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sanctions.map((s) => (
            <SanctionRow
              key={s.emailKey}
              s={s}
              onLift={async () => {
                await liftSanction(s.emailKey);
                done("제재를 해제했어요.");
              }}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
