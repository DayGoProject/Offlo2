"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import s from "./Navbar.module.css";

export default function Navbar() {
  const { user, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  }

  return (
    <nav className={s.navbar}>
      <div className={s.navInner}>
        <Link href="/" className="text-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Offlo
        </Link>

        <div className={s.navLinks}>
          <Link href="/analysis" className={s.navLink}>AI 분석</Link>
          <Link href="#companion" className={s.navLink}>반려 키우기</Link>
          <Link href="#features" className={s.navLink}>기능</Link>
        </div>

        <div className={s.navAuth}>
          {loading ? (
            <div style={{ width: "140px", opacity: 0 }} aria-hidden />
          ) : user ? (
            <div className={s.dropdownWrapper} ref={dropdownRef}>
              <button
                className={s.userButton}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-label="사용자 메뉴"
              >
                <div className={s.avatar}>
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt={getDisplayName()} className={s.avatarImg} />
                  ) : (
                    <span>{getInitial()}</span>
                  )}
                </div>
                <span className={s.userName}>{getDisplayName()}</span>
              </button>

              {dropdownOpen && (
                <div className={s.dropdown}>
                  <Link
                    href="/analysis"
                    className={s.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    AI 분석하기
                  </Link>
                  <Link
                    href="/dashboard"
                    className={s.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    대시보드
                  </Link>
                  <div className={s.dropdownDivider} />
                  <button className={s.dropdownItem} onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className={s.loginLink}>로그인</Link>
              <Link href="/signup" className={s.navCtaButton}>무료 시작</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
