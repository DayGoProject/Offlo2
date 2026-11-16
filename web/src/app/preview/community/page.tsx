import { notFound } from "next/navigation";

import PreviewModeration from "./PreviewModeration";

/**
 * 커뮤니티 신고 · 차단 패널 · 차단한 사용자 목록 미리보기 — **개발 전용**이다. 로그인 · API 없이 `ModerationPanel` · `BlockedUsersList`를
 * 샘플 값 + 가짜 처리로 열어 눈으로 확인한다 (`?fail=1`이면 처리가 실패한다). 프로덕션에서는 없는 페이지다 (404). 이름은 지어낸 값이다.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ fail?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { fail } = await searchParams;
  return <PreviewModeration fail={fail === "1"} />;
}
