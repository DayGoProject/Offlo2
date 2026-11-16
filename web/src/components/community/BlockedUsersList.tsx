"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { BLOCKED_EMPTY } from "@/lib/moderation-copy";
import type { BlockedUser } from "@/services/community";

/* ── 차단한 사용자 목록 (설정) ─────────────────────────────────
   커뮤니티 글 · 댓글의 "신고 · 차단"으로 차단한 사람들. 차단은 풀 수도 있어야 한다 (Play UGC 정책 · 앱 `BlockedUsersView`와 같다).
   해제는 되돌려도 되는 일(다시 차단하면 된다)이라 한 번 누르면 바로 풀린다. 한 번에 한 사람씩 — 보내는 중에는 다른 버튼도 잠근다.
   props로만 그린다 — 불러오기 · 해제 호출은 설정 페이지가 한다.
   ────────────────────────────────────────────────────────── */

export default function BlockedUsersList({
  items,
  error,
  onRetry,
  onUnblock,
}: {
  /** 처음 불러오는 중이거나 못 불러왔으면 null */
  items: BlockedUser[] | null;
  error: string | null;
  onRetry: () => void;
  /** 차단 해제 — 실패하면 문구, 성공하면 null (부모가 목록에서 뺀다) */
  onUnblock: (user: BlockedUser) => Promise<string | null>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);

  async function unblock(user: BlockedUser) {
    if (busyId) return;
    setBusyId(user.userId);
    setFailed(null);
    try {
      const message = await onUnblock(user);
      if (message) setFailed({ id: user.userId, message });
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-[18px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
        <button onClick={onRetry} className="text-xs shrink-0 min-h-9 transition-opacity hover:opacity-75 cursor-pointer" style={{ color: "var(--text-primary)" }}>
          다시 시도
        </button>
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-[58px] rounded-[9px] animate-pulse" style={{ background: "var(--bg-bar)" }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[13px] leading-[21px] break-keep" style={{ color: "var(--text-muted)" }}>
        {BLOCKED_EMPTY}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((user) => (
        <li key={user.userId} className="flex flex-col gap-2 w-full px-4 py-3 rounded-[9px]" style={{ background: "var(--bg-nav)" }}>
          <div className="flex items-center gap-3 w-full">
            <span
              className="num flex items-center justify-center w-8 h-8 rounded-full shrink-0"
              style={{ background: "var(--score-track)", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, letterSpacing: 0 }}
            >
              {user.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <p className="text-[13px] leading-4 font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {user.name}
              </p>
              {user.createdAt && (
                <p className="text-[11px] leading-[14px]" style={{ color: "var(--text-muted)" }}>
                  <span className="num" style={{ letterSpacing: 0 }}>
                    {fmtDate(user.createdAt)}
                  </span>{" "}
                  차단
                </p>
              )}
            </div>
            <button
              onClick={() => void unblock(user)}
              disabled={busyId !== null}
              className="flex items-center h-8 px-3.5 rounded-full text-xs font-medium shrink-0 transition-opacity hover:opacity-75 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
            >
              {busyId === user.userId ? "푸는 중…" : "차단 해제"}
            </button>
          </div>
          {failed?.id === user.userId && (
            <p role="alert" className="text-xs leading-[18px]" style={{ color: "var(--danger)" }}>
              {failed.message}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
