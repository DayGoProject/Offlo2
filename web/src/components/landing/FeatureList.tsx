import { CHALK, LINE, BLOOM, BLOOM_SOFT } from './tokens'

/* 체크 아이콘 + 한 줄 기능 목록 — AI 분석·확장 프로그램 섹션이 공유한다. */
export default function FeatureList({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col w-full ${className}`} style={{ borderTop: `1px solid ${LINE}` }}>
      {items.map((item, i) => (
        <li
          key={item}
          className="flex items-center gap-3.5 py-3.5"
          style={
            i < items.length - 1 ? { borderBottom: '1px solid rgba(216,216,216,0.07)' } : undefined
          }
        >
          <span
            aria-hidden
            className="flex items-center justify-center w-[22px] h-[22px] shrink-0 rounded-full"
            style={{ background: BLOOM_SOFT }}
          >
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4.2L3.6 6.6 9 1.2"
                stroke={BLOOM}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            className="text-[14px] sm:text-[15px] font-semibold tracking-[-0.02em]"
            style={{ color: CHALK }}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}
