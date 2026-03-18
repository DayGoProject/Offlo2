"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { signInWithGoogle, signUpWithEmail, getAuthErrorMessage, getFirebaseErrorCode } from "@/services/auth";
import GoogleIcon from "@/components/icons/GoogleIcon";
import s from "@/styles/auth.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  async function handleGoogleSignup() {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err: unknown) {
      const code = getFirebaseErrorCode(err);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setError(getAuthErrorMessage(code));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setEmailLoading(true);
    try {
      const credential = await signUpWithEmail(email, password);
      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }
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
        <h1 className={s.title}>회원가입</h1>
        <p className={s.subtitle}>무료로 시작해보세요</p>

        <button className={s.googleButton} onClick={handleGoogleSignup} disabled={googleLoading} type="button">
          <GoogleIcon />
          {googleLoading ? "처리 중..." : "Google로 계속하기"}
        </button>

        <div className={s.divider}><span>또는</span></div>

        <form className={s.form} onSubmit={handleEmailSignup}>
          <div className={s.field}>
            <label className={s.label} htmlFor="displayName">이름</label>
            <input id="displayName" className={s.input} type="text" placeholder="홍길동"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name" />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="email">이메일</label>
            <input id="email" className={s.input} type="email" placeholder="name@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="password">비밀번호</label>
            <input id="password" className={s.input} type="password" placeholder="6자 이상 입력해주세요"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="confirmPassword">비밀번호 확인</label>
            <input id="confirmPassword" className={s.input} type="password" placeholder="비밀번호를 다시 입력해주세요"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>

          {error && <p className={s.error}>{error}</p>}

          <button className={s.submitButton} type="submit" disabled={emailLoading}>
            {emailLoading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className={s.footer}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className={s.footerLink}>로그인</Link>
        </p>
      </div>
    </div>
  );
}
