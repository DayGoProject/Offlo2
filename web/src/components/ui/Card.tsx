/**
 * 공통 카드 서피스.
 *
 * 13단계 이전에는 5개 페이지가 같은 마크업을 각자 정의하고 있었다(패딩만 p-5/p-6로 달랐다).
 * 패딩은 className으로 덮지 않고 `pad` prop으로 받는다 — 같은 요소에 p-5와 p-6가
 * 함께 붙으면 어느 쪽이 이길지 Tailwind 출력 순서에 의존하게 되기 때문이다.
 */
export default function Card({
  children,
  className = "",
  pad = "p-5",
}: {
  children: React.ReactNode;
  className?: string;
  pad?: string;
}) {
  return (
    <div
      className={`rounded-2xl ${pad} ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {children}
    </div>
  );
}
