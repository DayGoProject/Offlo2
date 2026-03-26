"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { signInWithGoogle, signUpWithEmail, sendVerificationEmail, logout, getAuthErrorMessage, getFirebaseErrorCode } from "@/services/auth";
import GoogleIcon from "@/components/icons/GoogleIcon";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

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
      await sendVerificationEmail();
      setSentEmail(email);
      await logout();
      setVerificationSent(true);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(getFirebaseErrorCode(err)));
    } finally {
      setEmailLoading(false);
    }
  }

  const inputClass =
    "bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.1] dark:border-white/[0.1] rounded-xl px-4 py-3 text-sm text-[#0A0A0F] dark:text-white outline-none focus:border-brand transition-colors w-full placeholder:text-black/35 dark:placeholder:text-white/35";

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-black/[0.1] dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.03] rounded-2xl p-10 shadow-sm dark:shadow-none text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2 text-[#0A0A0F] dark:text-white">
            인증 메일을 보냈습니다
          </h1>
          <p className="text-sm text-black/50 dark:text-white/50 mb-1">
            아래 주소로 인증 링크를 발송했습니다.
          </p>
          <p className="text-sm font-semibold text-brand mb-6">{sentEmail}</p>
          <p className="text-sm text-black/50 dark:text-white/50 mb-8">
            받은 편지함에서 인증 링크를 클릭하면 가입이 완료됩니다.<br />
            스팸 폴더도 확인해보세요.
          </p>
          <Link
            href="/login"
            className="inline-block bg-brand text-[#0A0A0F] text-sm font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity"
          >
            로그인 하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-black/[0.1] dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.03] rounded-2xl p-10 shadow-sm dark:shadow-none">

        {/* 뒤로 */}
        <Link href="/" className="flex items-center justify-center gap-1.5 text-[0.8125rem] text-black/45 dark:text-white/45 mb-6 hover:text-black dark:hover:text-white transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 7H3M6 3L2 7l4 4" />
          </svg>
          메인으로
        </Link>

        {/* 로고 */}
        <Link href="/" className="text-gradient block text-center text-2xl font-extrabold tracking-tight mb-6">
          Offlo
        </Link>

        <h1 className="text-center text-2xl font-extrabold tracking-tight mb-1.5 text-[#0A0A0F] dark:text-white">
          회원가입
        </h1>
        <p className="text-center text-sm text-black/50 dark:text-white/50 mb-7">무료로 시작해보세요</p>

        {/* Google */}
        <button
          className="w-full flex items-center justify-center gap-3 bg-white text-[#111] text-sm font-semibold py-3 px-6 rounded-full border border-black/[0.1] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          type="button"
        >
          <GoogleIcon />
          {googleLoading ? "처리 중..." : "Google로 계속하기"}
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-black/[0.1] dark:bg-white/[0.1]" />
          <span className="text-xs text-black/40 dark:text-white/40 whitespace-nowrap">또는</span>
          <div className="flex-1 h-px bg-black/[0.1] dark:bg-white/[0.1]" />
        </div>

        {/* 이메일 폼 */}
        <form className="flex flex-col gap-4" onSubmit={handleEmailSignup}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-medium text-black/70 dark:text-white/70" htmlFor="displayName">이름</label>
            <input id="displayName" className={inputClass} type="text" placeholder="홍길동"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-medium text-black/70 dark:text-white/70" htmlFor="email">이메일</label>
            <input id="email" className={inputClass} type="email" placeholder="name@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-medium text-black/70 dark:text-white/70" htmlFor="password">비밀번호</label>
            <input id="password" className={inputClass} type="password" placeholder="6자 이상 입력해주세요"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-medium text-black/70 dark:text-white/70" htmlFor="confirmPassword">비밀번호 확인</label>
            <input id="confirmPassword" className={inputClass} type="password" placeholder="비밀번호를 다시 입력해주세요"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>

          {error && (
            <p className="text-[0.8125rem] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            className="w-full bg-brand text-[#0A0A0F] text-sm font-bold py-3.5 rounded-full border-none cursor-pointer hover:opacity-90 transition-opacity mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={emailLoading}
          >
            {emailLoading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-black/50 dark:text-white/50 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-brand font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
