"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";

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

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

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
        className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:bg-white/[0.06]"
        style={{ color: "var(--text-secondary)" }}
        aria-label="알림"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: "#3DDB87", color: "#0A0A0F" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 — 모바일에선 종이 상단바 우측에 있어 오른쪽 정렬해야
          화면 밖으로 나가지 않는다. 폭도 뷰포트를 넘지 않게 clamp 한다(360px 대응). */}
      {open && (
        <div
          className="absolute right-0 lg:right-auto lg:left-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl overflow-hidden z-50"
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
                style={{ color: "#3DDB87" }}
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
                  className="w-full flex gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04]"
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
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#3DDB87" }} />}
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
