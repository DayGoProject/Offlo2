"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";

const LANDING_NAV_LINKS = [
  { href: "/analysis", label: "AI 분석" },
  { href: "#companion", label: "반려 키우기" },
  { href: "#features", label: "기능" },
];

const APP_NAV_LINKS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/analysis", label: "AI 분석" },
  { href: "/goals", label: "목표" },
];

export default function Navbar() {
  const { user, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isLanding = pathname === "/";
  // 랜딩 페이지에서 스크롤 전에만 투명 배경 사용
  const transparent = isLanding && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 링크를 눌러 이동하면 모바일 메뉴가 열린 채로 남지 않게 닫는다
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    router.push("/");
  }

  function getDisplayName(): string {
    if (!user) return "";
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return "사용자";
  }

  function getInitial(): string {
    return getDisplayName().charAt(0).toUpperCase();
  }

  const navLinks = user ? APP_NAV_LINKS : LANDING_NAV_LINKS;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? "bg-black/55 backdrop-blur-sm"
          : "bg-[#040508]/95 backdrop-blur-md border-b border-chalk/[0.06]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="text-gradient text-xl font-extrabold tracking-tight">
          Offlo
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                transparent
                  ? "hover:opacity-100"
                  : pathname === href
                    ? "text-brand font-semibold"
                    : "text-chalk/60 hover:text-chalk"
              }`}
              style={transparent ? { color: "rgba(255,255,255,0.8)" } : undefined}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Auth + Theme Toggle */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-32 opacity-0" aria-hidden />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((p) => !p)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-label="사용자 메뉴"
              >
                <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt={getDisplayName()} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-brand text-sm font-bold">{getInitial()}</span>
                  )}
                </div>
                <span
                  className="text-sm hidden sm:block"
                  style={transparent ? { color: "rgba(255,255,255,0.85)" } : undefined}
                >
                  {getDisplayName()}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-44 bg-[#0B0D11] border border-chalk/[0.08] rounded-xl overflow-hidden shadow-2xl">
                  <Link href="/dashboard" className="block px-4 py-3 text-sm text-chalk/70 hover:text-chalk hover:bg-chalk/[0.04] transition-colors" onClick={() => setDropdownOpen(false)}>
                    대시보드
                  </Link>
                  <Link href="/analysis" className="block px-4 py-3 text-sm text-chalk/70 hover:text-chalk hover:bg-chalk/[0.04] transition-colors" onClick={() => setDropdownOpen(false)}>
                    AI 분석하기
                  </Link>
                  <Link href="/goals" className="block px-4 py-3 text-sm text-chalk/70 hover:text-chalk hover:bg-chalk/[0.04] transition-colors" onClick={() => setDropdownOpen(false)}>
                    목표 관리
                  </Link>
                  <div className="border-t border-chalk/[0.06]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-chalk/70 hover:text-chalk hover:bg-chalk/[0.04] transition-colors" onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm transition-colors"
                style={transparent ? { color: "rgba(255,255,255,0.8)" } : undefined}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="bg-brand text-[#040508] text-sm font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                무료 시작
              </Link>
            </>
          )}

          {/* 햄버거 — md 미만에서 숨겨진 네비 링크의 유일한 진입점 */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
            className={`md:hidden w-9 h-9 flex items-center justify-center rounded-full transition-all ${
              transparent
                ? "border"
                : "border border-chalk/[0.1] text-chalk/50 bg-chalk/[0.04]"
            }`}
            style={transparent ? { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" } : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 패널 */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{
            background: "var(--bg-page)",
            borderColor: "var(--border-card)",
          }}
        >
          <div className="px-4 py-2">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-3 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: pathname === href ? "#3DDB87" : "var(--text-secondary)" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
