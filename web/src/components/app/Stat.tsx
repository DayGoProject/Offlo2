/**
 * 지표 카드 — 라벨 / 큰 숫자 / 각주(또는 진행 바).
 *
 * 숫자는 Familjen Grotesk 38px이고 단위("분", "일째")는 Pretendard 15px이다.
 * 이 조합이 앱 전체를 묶는 장치다 — 밀도 높은 화면에 에디토리얼 인상을 주면서
 * 한글 글리프가 없는 라틴 폰트로 한글을 렌더하는 사고를 막는다.
 */
export default function Stat({
  label,
  value,
  unit,
  note,
  noteTone = "muted",
  progress,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  noteTone?: "muted" | "bloom";
  /** 0~1. 주면 각주 대신 진행 바를 그린다 */
  progress?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 flex-1 min-w-0 px-[22px] py-5 rounded-card ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <p className="text-xs leading-4 font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.01em" }}>
        {label}
      </p>

      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="num text-[38px] leading-[38px] truncate" style={{ color: "var(--text-primary)" }}>
          {value}
        </span>
        {unit && (
          <span className="text-[15px] leading-[18px] shrink-0" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </div>

      {progress !== undefined ? (
        <div className="h-[5px] w-full rounded-full overflow-hidden shrink-0" style={{ background: "var(--score-track)" }}>
          <div
            className="h-full rounded-full"
            style={{ background: "var(--color-bloom)", width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
      ) : (
        note && (
          <p
            // 모바일 2열에서는 각주가 잘리기 쉽다. 자르지 말고 두 줄까지 흘린다 —
            // "다음까지 1,116분" 같은 숫자가 잘리면 각주의 쓸모가 사라진다
            className="text-xs leading-4 font-medium line-clamp-2"
            style={{ color: noteTone === "bloom" ? "var(--color-bloom)" : "var(--text-muted)" }}
          >
            {note}
          </p>
        )
      )}
    </div>
  );
}

/** 지표 카드를 담는 행. 모바일 2열 → lg에서 한 줄. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 lg:flex gap-3 lg:gap-3.5 w-full">{children}</div>;
}
