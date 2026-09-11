"use client";

/**
 * 알약 세그먼트 컨트롤.
 *
 * Paper 디자인(앱 02 — 반려 정원의 Tabs)에서 가져왔다. 컨테이너는 4px 패딩의
 * 알약이고, 선택된 항목만 --accent-soft 배경 + bloom 텍스트를 받는다.
 * 정원(식물/동물) · 기록(전체/일간/주간) · 목표(진행 중/완료)가 같은 컨트롤을 쓴다.
 */
export default function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 rounded-full w-fit max-w-full overflow-x-auto shrink-0 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="flex items-center gap-2 h-[34px] px-4 sm:px-[18px] rounded-full text-[13px] whitespace-nowrap transition-colors cursor-pointer"
            style={{
              background: active ? "var(--accent-soft)" : undefined,
              color: active ? "var(--color-bloom)" : "var(--text-muted)",
              fontWeight: active ? 600 : 400,
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
