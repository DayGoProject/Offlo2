"use client";

import { useState } from "react";
import { Pill } from "@/components/app/PageHeader";
import { REPORT_REASONS, blockConfirmText, type ReportReason } from "@/lib/moderation-copy";

/* ── 신고 · 차단 패널 ──────────────────────────────────────────
   글 카드나 댓글 줄 안에서 펼쳐진다 (앱 `ModerationPanel`과 같은 흐름 · 브라우저 confirm을 쓰지 않는다).

   1단계 메뉴: "이 글(댓글) 신고하기" · "{이름}님 차단하기" · 닫기
   2단계 신고: 사유를 하나 고르고 "신고하기" — 사유는 서버와 같은 5개 (`lib/moderation-copy.ts`)
   2단계 차단: 무엇이 바뀌는지 안내 + "차단하기"

   성공하면 부모가 글 · 댓글을 치우므로 이 패널은 에러만 책임진다. 보내는 중에는 버튼이 잠긴다 (연달아 눌러도 한 번).
   props로만 그린다 — 서비스 호출은 부모가 한다.
   ────────────────────────────────────────────────────────── */

type Step = "menu" | "report" | "block";

export default function ModerationPanel({
  subject,
  authorName,
  onReport,
  onBlock,
  onClose,
}: {
  /** 문구에 쓴다 */
  subject: "글" | "댓글";
  authorName: string;
  /** 신고 — 실패하면 문구, 성공하면 null */
  onReport: (reason: ReportReason) => Promise<string | null>;
  /** 작성자 차단 — 실패하면 문구, 성공하면 null */
  onBlock: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<string | null>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const failed = await task();
      if (failed) setError(failed);
    } finally {
      setBusy(false);
    }
  }

  const menuRow =
    "flex items-center w-full min-h-11 lg:min-h-9 text-left text-[13px] transition-opacity hover:opacity-75 cursor-pointer";

  return (
    <div
      className="flex flex-col gap-3 w-full p-3.5 rounded-[10px]"
      style={{ background: "var(--bg-nav)", border: "1px solid var(--border-card)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      {step === "menu" && (
        <div className="flex flex-col" role="menu" aria-label={`이 ${subject} 신고 · 차단`}>
          <button role="menuitem" onClick={() => setStep("report")} className={menuRow} style={{ color: "var(--text-primary)" }}>
            이 {subject} 신고하기
          </button>
          <button role="menuitem" onClick={() => setStep("block")} className={menuRow} style={{ color: "var(--text-primary)" }}>
            <span className="truncate">{authorName}님 차단하기</span>
          </button>
          <button role="menuitem" onClick={onClose} className={menuRow} style={{ color: "var(--text-muted)" }}>
            닫기
          </button>
        </div>
      )}

      {step === "report" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-5 font-semibold" style={{ color: "var(--text-primary)" }}>
            어떤 문제인가요?
          </p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="신고 사유">
            {REPORT_REASONS.map((r) => {
              const selected = reason === r.value;
              return (
                <button
                  key={r.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setReason(r.value)}
                  className="flex items-center gap-3 w-full min-h-[52px] px-3.5 py-2.5 rounded-card text-left transition-colors cursor-pointer"
                  style={{
                    background: selected ? "var(--accent-soft)" : "var(--bg-card)",
                    border: `1px solid ${selected ? "rgba(61,219,135,0.35)" : "var(--border-card)"}`,
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{
                      border: `1.5px solid ${selected ? "var(--color-bloom)" : "var(--text-faint)"}`,
                      background: selected ? "var(--color-bloom)" : "transparent",
                    }}
                  />
                  <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-[13px] leading-[18px]" style={{ color: selected ? "var(--color-bloom)" : "var(--text-primary)" }}>
                      {r.label}
                    </span>
                    <span className="text-[11px] leading-[15px]" style={{ color: "var(--text-muted)" }}>
                      {r.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-[19px]" style={{ color: "var(--text-muted)" }}>
            신고하면 이 {subject}은 바로 보이지 않아요. 상대에게는 알리지 않고, 운영자가 확인해요.
          </p>
          <div className="flex items-center justify-end gap-[18px]">
            <button onClick={onClose} className="text-[13px] min-h-11 transition-opacity hover:opacity-75 cursor-pointer" style={{ color: "var(--text-muted)" }}>
              취소
            </button>
            <Pill variant="accent" disabled={!reason || busy} onClick={() => reason && void run(() => onReport(reason))}>
              {busy ? "보내는 중…" : "신고하기"}
            </Pill>
          </div>
        </div>
      )}

      {step === "block" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-5 font-semibold break-words" style={{ color: "var(--text-primary)" }}>
            {authorName}님을 차단할까요?
          </p>
          <p className="text-xs leading-[19px] break-keep" style={{ color: "var(--text-muted)" }}>
            {blockConfirmText(authorName)}
          </p>
          <div className="flex items-center justify-end gap-[18px]">
            <button onClick={onClose} className="text-[13px] min-h-11 transition-opacity hover:opacity-75 cursor-pointer" style={{ color: "var(--text-muted)" }}>
              취소
            </button>
            <Pill variant="accent" disabled={busy} onClick={() => void run(onBlock)}>
              {busy ? "차단하는 중…" : "차단하기"}
            </Pill>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs leading-[18px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
