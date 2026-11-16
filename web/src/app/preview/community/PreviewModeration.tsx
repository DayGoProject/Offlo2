"use client";

import { useState } from "react";
import ModerationPanel from "@/components/community/ModerationPanel";
import BlockedUsersList from "@/components/community/BlockedUsersList";
import { NOTICE_REPORTED, NOTICE_REPORTED_COMMENT, noticeBlocked } from "@/lib/moderation-copy";
import type { BlockedUser } from "@/services/community";

const SAMPLE: BlockedUser[] = [
  { userId: "u1", name: "서연", createdAt: "2026-11-14T03:00:00.000Z" },
  { userId: "u2", name: "아주아주긴이름을가진사용자아주아주긴이름을가진사용자", createdAt: "2026-11-02T03:00:00.000Z" },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PreviewModeration({ fail }: { fail: boolean }) {
  const [log, setLog] = useState<string[]>([]);
  const [postOpen, setPostOpen] = useState(true);
  const [commentOpen, setCommentOpen] = useState(true);
  const [blocks, setBlocks] = useState<BlockedUser[]>(SAMPLE);

  const push = (line: string) => setLog((prev) => [...prev, line]);
  const fake = async (ok: string): Promise<string | null> => {
    await wait(500);
    if (fail) return "요청을 처리하지 못했습니다.";
    push(ok);
    return null;
  };

  return (
    <main className="min-h-screen flex flex-col gap-6 p-6 max-w-[640px] mx-auto" style={{ background: "var(--bg-page)" }}>
      <section className="flex flex-col gap-3 px-6 py-[22px] rounded-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>글 패널</p>
        {postOpen ? (
          <ModerationPanel
            subject="글"
            authorName="서연"
            onReport={async (reason) => {
              const r = await fake(`post report: ${reason} → ${NOTICE_REPORTED}`);
              if (!r) setPostOpen(false);
              return r;
            }}
            onBlock={async () => {
              const r = await fake(`post block → ${noticeBlocked("서연")}`);
              if (!r) setPostOpen(false);
              return r;
            }}
            onClose={() => setPostOpen(false)}
          />
        ) : (
          <button className="text-xs self-start" style={{ color: "var(--text-primary)" }} onClick={() => setPostOpen(true)}>
            다시 열기
          </button>
        )}
      </section>

      <section className="flex flex-col gap-3 px-6 py-[22px] rounded-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>댓글 패널</p>
        {commentOpen ? (
          <ModerationPanel
            subject="댓글"
            authorName="민준"
            onReport={async (reason) => {
              const r = await fake(`comment report: ${reason} → ${NOTICE_REPORTED_COMMENT}`);
              if (!r) setCommentOpen(false);
              return r;
            }}
            onBlock={async () => {
              const r = await fake(`comment block → ${noticeBlocked("민준")}`);
              if (!r) setCommentOpen(false);
              return r;
            }}
            onClose={() => setCommentOpen(false)}
          />
        ) : (
          <button className="text-xs self-start" style={{ color: "var(--text-primary)" }} onClick={() => setCommentOpen(true)}>
            다시 열기
          </button>
        )}
      </section>

      <section className="flex flex-col gap-[18px] px-7 py-6 rounded-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
        <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
          차단한 사용자
        </h2>
        <BlockedUsersList
          items={blocks}
          error={null}
          onRetry={() => setBlocks(SAMPLE)}
          onUnblock={async (u) => {
            const r = await fake(`unblock ${u.userId}`);
            if (!r) setBlocks((prev) => prev.filter((b) => b.userId !== u.userId));
            return r;
          }}
        />
      </section>

      <pre data-testid="log" className="text-[11px] whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
        {log.join("\n")}
      </pre>
    </main>
  );
}
