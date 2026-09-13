"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import { relTime } from "@/lib/format";

/* ── 타입 ─────────────────────────────────────────────────────── */

type NotificationType =
  | "badge_earned"
  | "plant_levelup"
  | "goal_deadline"
  | "pet_hungry"
  | "daily_reminder"
  | "post_comment";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

/* ── 유틸 ─────────────────────────────────────────────────────── */

const TYPE_EMOJI: Record<NotificationType, string> = {
  badge_earned: "🏆",
  plant_levelup: "🌱",
  goal_deadline: "🎯",
  pet_hungry: "🍽️",
  daily_reminder: "⏰",
  post_comment: "💬",
};

/* ── 알림 센터 ─────────────────────────────────────────────────── */

export default function NotificationCenter() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  /* Firestore 실시간 구독 */
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationItem)),
      () => setItems([])
    );
    return unsub;
  }, [user]);

  /* 바깥 클릭 시 닫기 */
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markRead(id: string) {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  async function markAllRead() {
    if (!user || unread === 0) return;
    const token = await user.getIdToken();
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  function handleItemClick(n: NotificationItem) {
    if (!n.read) markRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* 종 아이콘 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-chalk/[0.06]"
        style={{ color: "var(--text-muted)" }}
        aria-label="알림"
      >
        {/* Paper 디자인의 종 — 16 뷰박스 / stroke 1.2 */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1.6a4.2 4.2 0 0 0-4.2 4.2v3L2.6 11.4h10.8L12.2 8.8v-3A4.2 4.2 0 0 0 8 1.6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M6.6 13.2a1.5 1.5 0 0 0 2.8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span
            className="num absolute top-1 right-1 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full text-[10px]"
            style={{ background: "var(--color-bloom)", color: "#040508", fontWeight: 600, letterSpacing: 0 }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 — 모바일에선 종이 상단바 우측에 있어 오른쪽 정렬해야
          화면 밖으로 나가지 않는다. 폭도 뷰포트를 넘지 않게 clamp 한다(360px 대응). */}
      {open && (
        <div
          className="absolute right-0 lg:right-auto lg:left-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-card overflow-hidden z-50"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-card)" }}
          >
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              알림
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--color-bloom)" }}
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                아직 알림이 없어요
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className="w-full flex gap-3 px-4 py-3 text-left transition-all hover:bg-chalk/[0.04]"
                  style={{
                    borderBottom: "1px solid var(--border-card)",
                    background: n.read ? undefined : "rgba(61,219,135,0.06)",
                  }}
                >
                  <span className="text-lg leading-none mt-0.5">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {n.title}
                      </span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--color-bloom)" }} />}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {n.body}
                    </span>
                    <span className="block text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                      {relTime(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
