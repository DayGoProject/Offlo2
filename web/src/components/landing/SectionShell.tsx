'use client'

import Streaks from './Streaks'
import SectionIndex from './SectionIndex'
import BloomGlow from './BloomGlow'

import { BLOOM } from './tokens'

// 하위 호환 — 기존 import 경로를 유지한다
export { CHALK, MIST, HAIR, BLOOM, VOID } from './tokens'


export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: BLOOM }} />
      <span className="text-[12px] font-semibold tracking-[0.14em]" style={{ color: BLOOM }}>
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
  glow,
}: {
  children: React.ReactNode
  variant?: number
  className?: string
  /** 하단 섹션 인덱스 번호 (Paper 시안과 동일) */
  index?: number
  indexAlign?: 'left' | 'right'
  /** 콘텐츠 뒤 브랜드 글로우의 위치·크기 클래스. 이미지와 겹치는 글로우는 여기 두지 말 것 (BloomGlow 주석) */
  glow?: string
}) {
  return (
    <section
      data-snap
      className={`relative w-full overflow-hidden flex items-center px-5 sm:px-8 py-24 sm:py-28 ${className}`}
      style={{ minHeight: '100svh' }}
    >
      <Streaks variant={variant} />
      {glow && <BloomGlow className={glow} strength={0.11} />}
      {/* 콘텐츠는 가운데 1120px — 1440 기준 좌우 160px. 가장자리(32px)는 상단바·섹션 인덱스 몫이다 */}
      <div className="relative z-10 mx-auto w-full max-w-[1120px]">{children}</div>
      {index !== undefined && <SectionIndex current={index} align={indexAlign} />}
    </section>
  )
}
