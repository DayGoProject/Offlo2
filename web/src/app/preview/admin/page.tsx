import { notFound } from "next/navigation";

import PreviewAdmin from "./PreviewAdmin";

/**
 * 관리자 신고 처리 화면 미리보기 — **개발 전용**이다. 로그인 · API 없이 `ReportCard` · `SanctionRow`를 샘플 값 + 가짜 처리로 열어 눈으로 확인한다
 * (`?tab=reports|sanctions` · `&fail=1`이면 처리가 실패한다). 프로덕션에서는 없는 페이지다 (404). 이름 · 이메일은 지어낸 값이다.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; fail?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { tab, fail } = await searchParams;
  return <PreviewAdmin tab={tab === "sanctions" ? "sanctions" : "reports"} fail={fail === "1"} />;
}
