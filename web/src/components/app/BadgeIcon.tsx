import type { BadgeDef } from "@/lib/badge-utils";

/**
 * 48px 원형 배지 아이콘.
 *
 * 획득한 배지는 브랜드 그린, 잠긴 배지는 자물쇠 하나로 통일한다 —
 * 잠긴 아이콘을 회색조로 보여주면 '고장난 것'처럼 읽힌다.
 */
export default function BadgeIcon({ badge, locked = false }: { badge: BadgeDef; locked?: boolean }) {
  if (locked) {
    return (
      <span
        className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
        style={{ background: "var(--score-track)" }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4.4" y="8.8" width="11.2" height="7.6" rx="1.8" stroke="rgba(216,216,216,0.3)" strokeWidth="1.4" />
          <path d="M7 8.8V6.6a3 3 0 0 1 6 0v2.2" stroke="rgba(216,216,216,0.3)" strokeWidth="1.4" />
        </svg>
      </span>
    );
  }

  const { d, mode, width } = badge.icon;
  return (
    <span
      className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
      style={{ background: "var(--accent-soft)" }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d={d}
          fill={mode === "fill" ? "var(--color-bloom)" : "none"}
          stroke={mode === "stroke" ? "var(--color-bloom)" : undefined}
          strokeWidth={width}
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
