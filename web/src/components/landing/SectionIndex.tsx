'use client'

import { CHALK, MIST, HAIR } from './tokens'

/* 섹션 인덱스 — 스냅 스크롤에서 "지금 몇 번째 화면인가"를 알려준다.
   Paper 시안의 각 아트보드 하단에 있는 것과 동일하다. */
export default function SectionIndex({
  current,
  total = 6,
  align = 'left',
}: {
  current: number
  total?: number
  align?: 'left' | 'right'
}) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div
      aria-hidden
      className={`absolute bottom-10 z-20 pointer-events-none flex items-center gap-3 ${
        align === 'left' ? 'left-5 sm:left-8' : 'right-5 sm:right-8'
      }`}
    >
      <span
        className="font-display text-[11px] font-medium tracking-[0.01em]"
        style={{ color: CHALK }}
      >
        {pad(current)}
      </span>
      <span className="block w-[46px] h-px" style={{ background: HAIR }} />
      <span className="font-display text-[11px] tracking-[0.01em]" style={{ color: MIST }}>
        {pad(total)}
      </span>
    </div>
  )
}
