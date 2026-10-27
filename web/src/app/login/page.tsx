"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithGoogle, logout, getAuthErrorMessage, getFirebaseErrorCode } from "@/services/auth";
import GoogleIcon from "@/components/icons/GoogleIcon";

/**
 * 로그인 — **Google 단독.** 이메일 · 비밀번호 로그인과 회원가입은 없다 (앱과 같은 방침).
 * 처음 로그인하는 Google 계정은 그 자리에서 가입된다: 서버가 uid 기준으로 프로필을 만들고(`POST /api/users` — 이미 있으면 그대로), 실패하면 로그인도 되돌린다
 * (서버 프로필 없이 들어가면 이후 모든 API가 깨진 채로 보인다).
 */
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      const token = await result.user.getIdToken();
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: result.user.email ?? "",
          name: result.user.displayName ?? result.user.email ?? "",
        }),
      });
      if (!res.ok) {
        await logout();
        setError("계정을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      router.push("/");
    } catch (err: unknown) {
      const code = getFirebaseErrorCode(err);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      console.error("[Google 로그인 실패]", code, err);
      setError(getAuthErrorMessage(code));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md border border-chalk/[0.1] bg-chalk/[0.03] rounded-2xl p-6 sm:p-10 shadow-none">

        {/* 뒤로 */}
        <Link href="/" className="flex items-center justify-center gap-1.5 text-[0.8125rem] text-chalk/45 mb-6 hover:text-chalk transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 7H3M6 3L2 7l4 4" />
          </svg>
          메인으로
        </Link>

        {/* 로고 */}
        <Link href="/" className="text-gradient block text-center text-2xl font-extrabold tracking-tight mb-6">
          Offlo
        </Link>

        <h1 className="text-center text-2xl font-extrabold tracking-tight mb-1.5 text-chalk">
          시작하기
        </h1>
        <p className="text-center text-sm text-chalk/50 mb-7">Google 계정으로 로그인하면 바로 시작돼요. 처음이면 계정이 만들어져요.</p>

        {/* Google */}
        <button
          className="w-full flex items-center justify-center gap-3 bg-chalk text-[#111] text-sm font-semibold py-3 px-6 rounded-full border border-black/[0.1] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          type="button"
        >
          <GoogleIcon />
          {googleLoading ? "로그인 중..." : "Google로 계속하기"}
        </button>

        {error && (
          <p className="text-[0.8125rem] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 mt-5" role="alert">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-chalk/40 mt-7 leading-relaxed">
          계속하면 <Link href="/privacy" className="text-chalk/60 underline hover:text-chalk">개인정보 처리방침</Link>을 읽고 동의한 것으로 봐요.
        </p>
      </div>
    </div>
  );
}
