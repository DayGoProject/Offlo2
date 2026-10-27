"use client";

import { useState } from "react";
import { Pill } from "@/components/app/PageHeader";
import { ErrorNote } from "@/components/app/Field";
import { REASON_LABEL, type ActiveSanction, type QueueItem, type ReportReason, type SanctionRequest } from "@/services/admin";

/**
 * 관리자 화면의 카드 둘 — **서버를 부르지 않는다** (처리 함수를 props로 받는다). `/admin`은 실제 API를, 개발 전용 `/preview/admin`은 샘플 값 + 가짜 처리를 넘긴다.
 */

/** 제재 고르기 값 → 서버 요청 */
const SANCTION_CHOICES = [
  { value: "none", label: "삭제만 (제재 없음)" },
  { value: "warn", label: "삭제 + 경고" },
  { value: "c7", label: "삭제 + 커뮤니티 7일 정지" },
  { value: "c30", label: "삭제 + 커뮤니티 30일 정지" },
  { value: "cperm", label: "삭제 + 커뮤니티 영구 정지" },
  { value: "ban", label: "삭제 + 계정 영구 정지 (글 · 댓글 모두 삭제)" },
] as const;
type Choice = (typeof SANCTION_CHOICES)[number]["value"];

export function toRequest(choice: Choice, reason: ReportReason): SanctionRequest | undefined {
  switch (choice) {
    case "none":
      return undefined;
    case "warn":
      return { kind: "warn", reason };
    case "c7":
      return { kind: "community", days: 7, reason };
    case "c30":
      return { kind: "community", days: 30, reason };
    case "cperm":
      return { kind: "community", days: null, reason };
    case "ban":
      return { kind: "ban", reason };
  }
}

const dateText = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
export const untilText = (until: string | null | undefined) => (until === undefined ? null : until === null ? "커뮤니티 영구 정지" : `커뮤니티 정지 ~${dateText(until)}`);

/** 가장 많이 나온 신고 사유 — 제재 사유의 기본값 */
function topReason(item: QueueItem): ReportReason {
  const counts = new Map<ReportReason, number>();
  for (const r of item.reports) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
}

const selectStyle: React.CSSProperties = { background: "var(--bg-nav)", border: "1px solid var(--border-card)", color: "var(--text-primary)" };
const selectClass = "h-10 px-3 rounded-[9px] text-[13px] outline-none max-w-full";
const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border-card)" };

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "accent" | "danger" }) {
  const style: Record<string, React.CSSProperties> = {
    plain: { border: "1px solid var(--border-card)", color: "var(--text-secondary)" },
    accent: { border: "1px solid rgba(61,219,135,0.3)", color: "var(--color-bloom)", background: "var(--accent-soft)" },
    danger: { border: "1px solid var(--danger-line)", color: "var(--danger)", background: "var(--danger-soft)" },
  };
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] whitespace-nowrap" style={style[tone]}>
      {children}
    </span>
  );
}

export function ReportCard({
  item,
  onDelete,
  onDismiss,
}: {
  item: QueueItem;
  /** 글 · 댓글을 지운다 (제재가 있으면 함께) — 실패하면 던진다 */
  onDelete: (sanction: SanctionRequest | undefined) => Promise<void>;
  onDismiss: () => Promise<void>;
}) {
  const [choice, setChoice] = useState<Choice>("none");
  const [reason, setReason] = useState<ReportReason>(() => topReason(item));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  const author = item.author;
  const suspended = untilText(author.communityUntil);

  return (
    <article data-testid={`report-${item.key}`} className="flex flex-col gap-4 w-full px-[22px] py-5 rounded-card" style={cardStyle}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={item.hidden ? "danger" : "plain"}>{item.targetType === "post" ? "글" : "댓글"}</Chip>
        <Chip tone={item.hidden ? "danger" : "accent"}>신고 {item.reportCount}건</Chip>
        {item.hidden ? <Chip tone="danger">모두에게 숨김</Chip> : null}
        {item.badgeName ? <Chip>배지 자랑 · {item.badgeName}</Chip> : null}
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          작성 {dateText(item.createdAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[13px]" style={{ color: "var(--text-primary-soft)" }}>
        <strong style={{ color: "var(--text-primary)" }}>{author.name}</strong>
        <span className="break-all" style={{ color: "var(--text-muted)" }}>
          {author.email}
        </span>
        {author.strikes > 0 ? <Chip tone="danger">제재 이력 {author.strikes}회</Chip> : <Chip>이력 없음</Chip>}
        {author.banned ? <Chip tone="danger">계정 영구 정지</Chip> : null}
        {suspended ? <Chip tone="danger">{suspended}</Chip> : null}
      </div>

      {item.content ? (
        <p className="text-[14px] leading-[23px] whitespace-pre-wrap break-words px-4 py-3 rounded-[9px]" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", color: "var(--text-primary-soft)" }}>
          {item.content}
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {item.reports.map((r, i) => (
          <li key={i} className="text-[12px] leading-[18px]" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary-soft)" }}>{REASON_LABEL[r.reason]}</strong>
            {r.detail ? <> — {r.detail}</> : null} <span style={{ color: "var(--text-faint)" }}>· {dateText(r.createdAt)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <select
          aria-label="처리 방법"
          data-testid={`choice-${item.key}`}
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value as Choice);
            setConfirm(false);
          }}
          className={selectClass}
          style={selectStyle}
        >
          {SANCTION_CHOICES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {choice !== "none" ? (
          <select aria-label="사용자에게 알리는 사유" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} className={selectClass} style={selectStyle}>
            {(Object.keys(REASON_LABEL) as ReportReason[]).map((r) => (
              <option key={r} value={r}>
                사유 · {REASON_LABEL[r]}
              </option>
            ))}
          </select>
        ) : null}

        {confirm ? (
          <>
            <Pill variant="primary" disabled={busy} onClick={() => void run(() => onDelete(toRequest(choice, reason)))}>
              {busy ? "처리 중…" : choice === "ban" ? "정말 계정을 정지할까요?" : "확인 — 지우고 처리"}
            </Pill>
            <Pill onClick={() => setConfirm(false)}>취소</Pill>
          </>
        ) : (
          <Pill variant="accent" disabled={busy} onClick={() => setConfirm(true)}>
            지우고 처리
          </Pill>
        )}
        <Pill disabled={busy} onClick={() => void run(onDismiss)}>
          기각 (문제 없음)
        </Pill>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </article>
  );
}

export function SanctionRow({ s, onLift }: { s: ActiveSanction; onLift: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = s.banned ? "계정 영구 정지" : untilText(s.communityUntil);

  async function lift() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onLift();
    } catch (e) {
      setError(e instanceof Error ? e.message : "해제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article data-testid={`sanction-${s.emailKey.slice(0, 8)}`} className="flex flex-col gap-3 w-full px-[22px] py-5 rounded-card" style={cardStyle}>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <strong style={{ color: "var(--text-primary)" }}>{s.user ? s.user.name : "탈퇴한 계정"}</strong>
        {s.user ? (
          <span className="break-all" style={{ color: "var(--text-muted)" }}>
            {s.user.email}
          </span>
        ) : null}
        {status ? <Chip tone="danger">{status}</Chip> : null}
        <Chip>제재 이력 {s.strikes}회</Chip>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          최근 처리 {dateText(s.updatedAt)}
        </span>
        <span className="sm:ml-auto">
          <Pill disabled={busy} onClick={() => void lift()}>
            {busy ? "해제 중…" : "제재 해제"}
          </Pill>
        </span>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </article>
  );
}
