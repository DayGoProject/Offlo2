"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdditionalUserInfo } from "firebase/auth";
import { signInWithGoogle, signInWithEmail, getAuthErrorMessage, getFirebaseErrorCode } from "@/services/auth";
import GoogleIcon from "@/components/icons/GoogleIcon";
import s from "@/styles/auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (getAdditionalUserInfo(result)?.isNewUser) {
        // 가입 이력 없는 신규 계정 → 즉시 삭제 후 에러 표시
        await result.user.delete();
        setError(getAuthErrorMessage("no-account"));
        return;
      }
      router.push("/");
    } catch (err: unknown) {
      const code = getFirebaseErrorCode(err);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setError(getAuthErrorMessage(code));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEmailLoading(true);
    try {
      await signInWithEmail(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(getAuthErrorMessage(getFirebaseErrorCode(err)));
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div className={s.container}>
      <div className={s.card}>
        <Link href="/" className={s.backLink}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 7H3M6 3L2 7l4 4" />
          </svg>
          메인으로
        </Link>

        <Link href="/" className={`${s.logo} text-gradient`}>Offlo</Link>
        <h1 className={s.title}>로그인</h1>
        <p className={s.subtitle}>계속하려면 로그인해주세요</p>

        <button className={s.googleButton} onClick={handleGoogleLogin} disabled={googleLoading} type="button">
          <GoogleIcon />
          {googleLoading ? "로그인 중..." : "Google로 계속하기"}
        </button>

        <div className={s.divider}><span>또는</span></div>

        <form className={s.form} onSubmit={handleEmailLogin}>
          <div className={s.field}>
            <label className={s.label} htmlFor="email">이메일</label>
            <input id="email" className={s.input} type="email" placeholder="name@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="password">비밀번호</label>
            <input id="password" className={s.input} type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>

          {error && <p className={s.error}>{error}</p>}

          <button className={s.submitButton} type="submit" disabled={emailLoading}>
            {emailLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className={s.footer}>
          계정이 없으신가요?{" "}
          <Link href="/signup" className={s.footerLink}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}
