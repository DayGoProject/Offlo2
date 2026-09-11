/**
 * 공통 카드 서피스.
 *
 * 13단계 이전에는 5개 페이지가 같은 마크업을 각자 정의하고 있었다(패딩만 p-5/p-6로 달랐다).
 * 패딩은 className으로 덮지 않고 `pad` prop으로 받는다 — 같은 요소에 p-5와 p-6가
 * 함께 붙으면 어느 쪽이 이길지 Tailwind 출력 순서에 의존하게 되기 때문이다.
 *
 * 14단계: 라운드가 16px(rounded-2xl) → 12px(rounded-card)로 내려갔다.
 * Paper 디자인의 --radius-card와 같은 값이다. 다크 단일 팔레트에서 큰 라운드는
 * 카드 경계를 흐려 화면이 물러 보인다.
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
      className={`rounded-card ${pad} ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {children}
    </div>
  );
}

/** 카드 안의 소제목 — 라벨 12px + 우측 보조 텍스트. */
export function CardHead({ title, aside }: { title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <p className="text-sm font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      {aside && (
        <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)", letterSpacing: "0.01em" }}>
          {aside}
        </span>
      )}
    </div>
  );
}
