"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdditionalUserInfo } from "firebase/auth";
import { signInWithGoogle, signInWithEmail, getAuthErrorMessage, getFirebaseErrorCode } from "@/services/auth";
import GoogleIcon from "@/components/icons/GoogleIcon";

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
          로그인
        </h1>
        <p className="text-center text-sm text-black/50 dark:text-white/50 mb-7">계속하려면 로그인해주세요</p>

        {/* Google */}
        <button
          className="w-full flex items-center justify-center gap-3 bg-white text-[#111] text-sm font-semibold py-3 px-6 rounded-full border border-black/[0.1] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          type="button"
        >
          <GoogleIcon />
          {googleLoading ? "로그인 중..." : "Google로 계속하기"}
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-black/[0.1] dark:bg-white/[0.1]" />
          <span className="text-xs text-black/40 dark:text-white/40 whitespace-nowrap">또는</span>
          <div className="flex-1 h-px bg-black/[0.1] dark:bg-white/[0.1]" />
        </div>

        {/* 이메일 폼 */}
        <form className="flex flex-col gap-4" onSubmit={handleEmailLogin}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-medium text-black/70 dark:text-white/70" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              className="bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.1] dark:border-white/[0.1] rounded-xl px-4 py-3 text-sm text-[#0A0A0F] dark:text-white outline-none focus:border-brand transition-colors w-full placeholder:text-black/35 dark:placeholder:text-white/35"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-medium text-black/70 dark:text-white/70" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              className="bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.1] dark:border-white/[0.1] rounded-xl px-4 py-3 text-sm text-[#0A0A0F] dark:text-white outline-none focus:border-brand transition-colors w-full placeholder:text-black/35 dark:placeholder:text-white/35"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
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
            {emailLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm text-black/50 dark:text-white/50 mt-6">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-brand font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
