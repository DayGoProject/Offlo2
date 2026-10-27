"use client";

import { useState } from "react";
import { ReportCard, SanctionRow } from "@/components/admin/ModerationCards";
import type { ActiveSanction, QueueItem } from "@/services/admin";

const now = Date.parse("2026-10-27T01:00:00.000Z");
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

const ITEMS: QueueItem[] = [
  {
    key: "post_p1",
    targetType: "post",
    targetId: "p1",
    reportCount: 3,
    hidden: true,
    updatedAt: ago(5),
    content: "지어낸 문제 글입니다.\n여러 줄로 된 긴 본문도 그대로 보여야 합니다. 링크 http://example.invalid/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    badgeName: null,
    postId: null,
    createdAt: ago(180),
    reports: [
      { reason: "abuse", detail: "욕설이 있어요", createdAt: ago(40) },
      { reason: "abuse", detail: null, createdAt: ago(20) },
      { reason: "spam", detail: null, createdAt: ago(5) },
    ],
    author: { userId: "u1", name: "서연", email: "seoyeon@example.invalid", strikes: 1, banned: false },
  },
  {
    key: "comment_c9",
    targetType: "comment",
    targetId: "c9",
    reportCount: 1,
    hidden: false,
    updatedAt: ago(90),
    content: "지어낸 댓글입니다.",
    badgeName: null,
    postId: "p4",
    createdAt: ago(300),
    reports: [{ reason: "privacy", detail: "연락처가 적혀 있어요", createdAt: ago(90) }],
    author: { userId: "u2", name: "하준", email: "hajun-with-a-very-long-address-for-wrapping@example.invalid", strikes: 2, banned: false, communityUntil: "2026-11-03T01:00:00.000Z" },
  },
  {
    key: "post_p7",
    targetType: "post",
    targetId: "p7",
    reportCount: 1,
    hidden: false,
    updatedAt: ago(600),
    content: "",
    badgeName: "7일 연속",
    postId: null,
    createdAt: ago(900),
    reports: [{ reason: "other", detail: null, createdAt: ago(600) }],
    author: { userId: "u3", name: "민준", email: "minjun@example.invalid", strikes: 0, banned: false },
  },
];

const SANCTIONS: ActiveSanction[] = [
  { emailKey: "a".repeat(64), banned: true, strikes: 3, updatedAt: ago(2000), user: { id: "u9", name: "도윤", email: "doyun@example.invalid" } },
  { emailKey: "b".repeat(64), banned: false, communityUntil: null, strikes: 2, updatedAt: ago(5000), user: null },
];

export default function PreviewAdmin({ tab, fail }: { tab: "reports" | "sanctions"; fail: boolean }) {
  const [items, setItems] = useState(ITEMS);
  const [sanctions, setSanctions] = useState(SANCTIONS);
  const [log, setLog] = useState<string[]>([]);

  const act = async (entry: string, after: () => void) => {
    await new Promise((r) => setTimeout(r, 150));
    if (fail) throw new Error("인터넷에 연결되어 있지 않거나 서버에 닿지 않았습니다.");
    setLog((l) => [...l, entry]);
    after();
  };

  return (
    <main className="flex flex-col gap-4 w-full max-w-[880px] mx-auto px-4 sm:px-6 py-8" style={{ background: "var(--bg-page)", minHeight: "100vh" }} data-testid="preview-admin">
      <h1 className="text-[26px]" style={{ color: "var(--text-primary)" }}>
        신고 처리 (미리보기)
      </h1>
      <p data-testid="preview-log" className="text-xs" style={{ color: "var(--text-muted)" }}>
        {log.join(" | ")}
      </p>
      {tab === "reports"
        ? items.map((item) => (
            <ReportCard
              key={item.key}
              item={item}
              onDelete={(sanction) => act(`delete ${item.key} ${sanction ? JSON.stringify(sanction) : "none"}`, () => setItems((l) => l.filter((x) => x.key !== item.key)))}
              onDismiss={() => act(`dismiss ${item.key}`, () => setItems((l) => l.filter((x) => x.key !== item.key)))}
            />
          ))
        : sanctions.map((s) => <SanctionRow key={s.emailKey} s={s} onLift={() => act(`lift ${s.emailKey.slice(0, 4)}`, () => setSanctions((l) => l.filter((x) => x.emailKey !== s.emailKey)))} />)}
    </main>
  );
}
