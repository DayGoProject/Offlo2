"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import { useTheme } from "@/context/ThemeContext";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Navbar() {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#F4F6F4]/95 dark:bg-[#0A0A0F]/95 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.06]"
          : "bg-black/55 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-gradient text-xl font-extrabold tracking-tight">
          Offlo
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { href: "/analysis", label: "AI 분석" },
            { href: "#companion", label: "반려 키우기" },
            { href: "#features", label: "기능" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${scrolled ? "text-black/50 dark:text-white/60 hover:text-black dark:hover:text-white" : "hover:opacity-100"}`}
              style={scrolled ? undefined : { color: "rgba(255,255,255,0.8)" }}
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
                  style={scrolled ? undefined : { color: "rgba(255,255,255,0.85)" }}
                >
                  {getDisplayName()}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-44 bg-white dark:bg-[#131318] border border-black/[0.08] dark:border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
                  <Link href="/analysis" className="block px-4 py-3 text-sm text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors" onClick={() => setDropdownOpen(false)}>
                    AI 분석하기
                  </Link>
                  <Link href="/dashboard" className="block px-4 py-3 text-sm text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors" onClick={() => setDropdownOpen(false)}>
                    대시보드
                  </Link>
                  <div className="border-t border-black/[0.06] dark:border-white/[0.06]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors" onClick={handleLogout}>
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
                style={scrolled ? undefined : { color: "rgba(255,255,255,0.8)" }}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="bg-brand text-[#0A0A0F] text-sm font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                무료 시작
              </Link>
            </>
          )}

          {/* 다크/라이트 토글 */}
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${scrolled ? "border border-black/[0.1] dark:border-white/[0.1] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/[0.2] dark:hover:border-white/[0.2] bg-black/[0.03] dark:bg-white/[0.04]" : "border hover:opacity-100"}`}
            style={scrolled ? undefined : { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </nav>
  );
}
