"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/services/auth";
import NotificationCenter from "@/components/notifications/NotificationCenter";

const NAV = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/analysis",
    label: "AI 분석",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 2v10l6.3 6.3" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "분석 기록",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "목표",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: "/garden",
    label: "정원",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12" /><path d="M5 3a7 7 0 0 0 7 7 7 7 0 0 0 7-7" />
        <path d="M5 14a6 6 0 0 0 6 6" /><path d="M19 14a6 6 0 0 1-6 6" />
      </svg>
    ),
  },
  {
    href: "/badges",
    label: "배지",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    href: "/community",
    label: "커뮤니티",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // lg 미만에서만 의미 있는 상태 — 데스크톱 사이드바는 항상 열려 있다
  const [open, setOpen] = useState(false);

  // 메뉴를 눌러 이동하면 드로어가 열린 채로 남지 않게 닫는다
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 드로어가 열린 동안 배경 스크롤 잠금 + ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <>
      {/* ── 모바일 상단바 (lg 미만) — 페이지 래퍼의 pt-14가 이 높이를 비워준다 ── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-4"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-card)" }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={open}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="text-gradient text-lg font-extrabold tracking-tight">
            Offlo
          </Link>
        </div>
        <NotificationCenter />
      </header>

      {/* ── 드로어 배경 ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-56 flex flex-col z-50 lg:z-40 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border-card)" }}
      >
        <div className="px-6 pt-7 pb-6 flex items-center justify-between">
          <Link href="/" className="text-gradient text-xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
            Offlo
          </Link>
          {/* 모바일에선 종 아이콘이 상단바에 있으므로 여기선 닫기 버튼을 둔다 */}
          <button
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="hidden lg:block">
            <NotificationCenter />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: active ? "#3DDB87" : "var(--text-secondary)",
                  background: active ? "rgba(61,219,135,0.08)" : undefined,
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6 space-y-0.5">
          <Link
            href="/settings"
            className="flex items-center gap-3 w-full px-4 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.04]"
            style={{ color: pathname === "/settings" ? "#3DDB87" : "var(--text-muted)" }}
          >
            <span style={{ opacity: pathname === "/settings" ? 1 : 0.6 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            설정
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.04]"
            style={{ color: "var(--text-muted)" }}
          >
            <span style={{ opacity: 0.6 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
