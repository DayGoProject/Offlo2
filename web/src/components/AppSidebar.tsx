"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import NotificationCenter from "@/components/notifications/NotificationCenter";

/* 아이콘은 Paper 디자인(앱 01 — 대시보드 / Sidebar)에서 그대로 가져왔다.
   16 뷰박스에 stroke 1.3 — 17px 루시드 아이콘보다 선이 얇아 사이드바가
   조용해진다. currentColor를 쓰므로 활성/비활성 색은 부모가 정한다. */
const NAV = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: (
      <>
        <rect x="1.6" y="1.6" width="5.2" height="5.2" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9.2" y="1.6" width="5.2" height="5.2" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <rect x="1.6" y="9.2" width="5.2" height="5.2" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9.2" y="9.2" width="5.2" height="5.2" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </>
    ),
  },
  {
    href: "/analysis",
    label: "AI 분석",
    icon: <path d="M2 12.4V7M6 12.4V3.6M10 12.4V9M14 12.4V5.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />,
  },
  {
    href: "/garden",
    label: "반려 정원",
    icon: (
      <>
        <path d="M8 14V6.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M7.7 7.4C6 7.2 4.3 6 3.7 4.1 5.6 3.6 7.3 4.8 7.7 7.4z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8.3 6.2c1.7-.2 3.4-1.5 4-3.4-1.9-.5-3.6.8-4 3.4z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </>
    ),
  },
  {
    href: "/goals",
    label: "목표",
    icon: (
      <>
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </>
    ),
  },
  {
    href: "/history",
    label: "분석 기록",
    icon: (
      <>
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 4.4V8l2.4 1.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/badges",
    label: "배지",
    icon: (
      <>
        <circle cx="8" cy="6.2" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.4 10.2 4.4 14.4 8 12.8l3.6 1.6-1-4.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/community",
    label: "커뮤니티",
    icon: (
      <>
        <circle cx="6" cy="5.6" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1.8 13.2c0-2.4 1.9-4.2 4.2-4.2s4.2 1.8 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M11 3.4a2.4 2.4 0 0 1 0 4.6M12.4 12.6c0-1.6-.6-3-1.6-3.9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
];

const SETTINGS_ICON = (
  <>
    <circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.6v1.8M8 12.6v1.8M14.4 8h-1.8M3.4 8H1.6M12.5 3.5l-1.3 1.3M4.8 11.2l-1.3 1.3M12.5 12.5l-1.3-1.3M4.8 4.8 3.5 3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </>
);

const LOGOUT_ICON = (
  <>
    <path d="M6.4 14H3.6a1.2 1.2 0 0 1-1.2-1.2V3.2A1.2 1.2 0 0 1 3.6 2h2.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10.8 11.2 14 8l-3.2-3.2M14 8H6.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

/* 아이콘 자리는 16×16 고정 슬롯이다. gap만으로 정렬하면 아이콘 폭이
   조금씩 다른 행에서 라벨의 세로 라인이 어긋난다. */
function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center w-4 h-4 shrink-0">
      <svg width="15" height="15" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        {children}
      </svg>
    </span>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  // lg 미만에서만 의미 있는 상태 — 데스크톱 사이드바는 항상 열려 있다
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState("무료 플랜");

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

  // 플랜은 ID 토큰 클레임에서 읽는다 — 캐시된 토큰이라 네트워크 요청이 없다
  useEffect(() => {
    if (!user) return;
    let alive = true;
    user
      .getIdTokenResult()
      .then((r) => {
        if (alive) setPlan(r.claims.premium ? "프리미엄" : "무료 플랜");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const name = user?.displayName || user?.email?.split("@")[0] || "게스트";
  const initial = name.charAt(0).toUpperCase();

  /* 터치 타깃은 모바일에서 44px, 데스크톱에서 Paper 디자인의 40px */
  const rowClass =
    "flex items-center gap-[11px] w-full h-11 lg:h-10 px-3 rounded-lg text-sm tracking-[-0.01em] transition-colors shrink-0";

  return (
    <>
      {/* ── 모바일 상단바 (lg 미만) — 페이지 래퍼의 pt-14가 이 높이를 비워준다 ── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-4"
        style={{ background: "var(--bg-nav)", borderBottom: "1px solid var(--border-card)" }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={open}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Brand />
        </div>
        <NotificationCenter />
      </header>

      {/* ── 드로어 배경 ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.62)" }}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-56 flex flex-col gap-[26px] px-4 py-[26px] z-50 lg:z-40 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--bg-nav)", borderRight: "1px solid var(--border-card)" }}
      >
        {/* ── 브랜드 + 알림 ── */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <Brand />
          {/* 모바일에선 종이 상단바에 있으므로 여기선 닫기 버튼을 둔다 */}
          <button
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="lg:hidden w-9 h-9 -mr-2 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="hidden lg:block -mr-1.5">
            <NotificationCenter />
          </div>
        </div>

        {/* ── 네비게이션 ── */}
        <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={rowClass}
                style={{
                  color: active ? "var(--color-bloom)" : "var(--text-muted)",
                  background: active ? "var(--accent-soft)" : undefined,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <NavIcon>{icon}</NavIcon>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── 프로필 · 설정 · 로그아웃 ── */}
        <div
          className="flex flex-col gap-3.5 pt-[18px] shrink-0"
          style={{ borderTop: "1px solid var(--border-card)" }}
        >
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="flex items-center justify-center w-[30px] h-[30px] rounded-full shrink-0 num"
              style={{ background: "var(--accent-soft)", color: "var(--color-bloom)", fontSize: 12, fontWeight: 600, letterSpacing: 0 }}
            >
              {initial}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-[13px] font-semibold tracking-[-0.01em] truncate" style={{ color: "var(--text-primary)" }}>
                {name}
              </p>
              <p className="text-[11px] leading-[14px]" style={{ color: "var(--text-muted)" }}>
                {plan}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={rowClass}
              style={{
                color: pathname === "/settings" ? "var(--color-bloom)" : "var(--text-muted)",
                background: pathname === "/settings" ? "var(--accent-soft)" : undefined,
                fontWeight: pathname === "/settings" ? 600 : 400,
              }}
            >
              <NavIcon>{SETTINGS_ICON}</NavIcon>
              설정
            </Link>

            <button onClick={handleLogout} className={rowClass} style={{ color: "var(--text-muted)" }}>
              <NavIcon>{LOGOUT_ICON}</NavIcon>
              로그아웃
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* 워드마크는 Familjen Grotesk. 그라디언트 텍스트를 쓰지 않는 이유는
   다크 단일 팔레트에서 링 + 코어 마크 하나로 이미 브랜드가 서기 때문이다. */
function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
      <svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <circle cx="11" cy="11" r="10" fill="none" stroke="var(--text-primary)" strokeWidth="1.3" />
        <circle cx="11" cy="11" r="3.1" fill="var(--color-bloom)" />
      </svg>
      <span
        className="num"
        style={{ color: "var(--text-primary)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: "22px" }}
      >
        OFFLO
      </span>
    </Link>
  );
}
