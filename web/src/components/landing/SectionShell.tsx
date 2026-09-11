'use client'

import Streaks from './Streaks'
import SectionIndex from './SectionIndex'

import { MIST, BLOOM } from './tokens'

// 하위 호환 — 기존 import 경로를 유지한다
export { CHALK, MIST, HAIR, BLOOM, VOID } from './tokens'


export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: BLOOM }} />
      <span className="text-[11px] font-semibold tracking-[0.14em]" style={{ color: MIST }}>
        {children}
      </span>
    </div>
  )
}

export default function SectionShell({
  children,
  variant = 1,
  className = '',
  index,
  indexAlign = 'left',
}: {
  children: React.ReactNode
  variant?: number
  className?: string
  /** 하단 섹션 인덱스 번호 (Paper 시안과 동일) */
  index?: number
  indexAlign?: 'left' | 'right'
}) {
  return (
    <section
      data-snap
      className={`relative w-full overflow-hidden flex items-center px-5 sm:px-8 py-24 sm:py-28 ${className}`}
      style={{ minHeight: '100svh' }}
    >
      <Streaks variant={variant} />
      <div className="relative z-10 mx-auto w-full max-w-[1372px]">{children}</div>
      {index !== undefined && <SectionIndex current={index} align={indexAlign} />}
    </section>
  )
}
