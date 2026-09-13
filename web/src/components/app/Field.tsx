/**
 * 폼 입력 공통 스타일.
 *
 * 라벨은 11px 대문자 트래킹(0.1em)으로 페이지 눈썹과 같은 언어를 쓴다.
 * 입력면은 카드보다 한 단계 어두운 --bg-subtle이다 — 카드 위에 얹히므로
 * 같은 색이면 경계가 사라진다.
 */
export const inputClass =
  "w-full h-[42px] px-3.5 rounded-lg text-sm outline-none transition-colors focus:border-[color:var(--color-bloom)]";

export const inputStyle: React.CSSProperties = {
  background: "var(--bg-subtle)",
  border: "1px solid var(--border-card)",
  color: "var(--text-primary)",
};

export default function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span
        className="text-[11px] leading-[14px] font-semibold"
        style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs leading-4" style={{ color: "var(--text-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

/** 폼·삭제 오류 등 위험 메시지 한 줄 */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="text-xs leading-4 px-3 py-2.5 rounded-lg"
      style={{ color: "var(--danger)", background: "var(--danger-soft)", border: "1px solid var(--danger-line)" }}
    >
      {children}
    </p>
  );
}
