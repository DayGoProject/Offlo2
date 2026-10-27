import { redirect } from "next/navigation";

/**
 * 회원가입 페이지는 없어졌다 — 로그인은 Google 단독이고, **처음 로그인하는 Google 계정은 그 자리에서 가입된다** (앱과 같은 방침).
 * 예전 링크 · 북마크가 깨지지 않게 로그인으로 보낸다.
 */
export default function SignupPage() {
  redirect("/login");
}
