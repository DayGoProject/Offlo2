import Link from "next/link";

/**
 * 앱 페이지 헤더 — 눈썹(점 + 라벨) · 제목 · 우측 액션.
 *
 * 제목은 34px weight 400이다. **굵게 하지 않는다** — 거대하되 가볍게가
 * 이 프로젝트의 타이포 규칙이고, 한글은 전각이라 34px에서 600을 주면
 * 화면이 무거워진다. 위계는 굵기가 아니라 크기와 색으로 만든다.
 */
export default function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 w-full">
      <div className="flex flex-col gap-[7px] min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-[9px]">
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: "var(--color-bloom)" }} />
            <span
              className="text-[11px] leading-[14px] font-semibold uppercase"
              style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
            >
              {eyebrow}
            </span>
          </div>
        )}
        <h1
          className="text-[26px] sm:text-[30px] lg:text-[34px] leading-[1.24]"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.035em", fontWeight: 400 }}
        >
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </header>
  );
}

/** 헤더 우측·카드 안에서 쓰는 알약 버튼. Paper 기준 높이 38px. */
export function Pill({
  href,
  onClick,
  variant = "ghost",
  type = "button",
  disabled,
  className = "",
  children,
}: {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "accent";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 h-[38px] rounded-full text-[13px] whitespace-nowrap transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

  const skin: Record<string, { className: string; style: React.CSSProperties }> = {
    // 흰 알약 — 한 화면에 하나만. 두 개가 되는 순간 둘 다 주목받지 못한다
    primary: {
      className: "px-5 font-semibold hover:opacity-90",
      style: { background: "#FFFFFF", color: "var(--bg-page)" },
    },
    accent: {
      className: "px-5 font-semibold hover:opacity-90",
      style: { background: "var(--color-bloom)", color: "var(--bg-page)" },
    },
    ghost: {
      className: "px-[18px] font-medium hover:opacity-75",
      style: { border: "1px solid var(--border-strong)", color: "var(--text-primary)" },
    },
  };

  const s = skin[variant];
  const cls = `${base} ${s.className} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} style={s.style}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${cls} cursor-pointer`} style={s.style}>
      {children}
    </button>
  );
}
