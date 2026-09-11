'use client'

import Link from 'next/link'
import HeroSprout from '@/components/hero/HeroSprout'
import Streaks from './Streaks'

const CHALK = '#D8D8D8'
const MIST = 'rgba(216,216,216,0.45)'
const HAIR = 'rgba(216,216,216,0.22)'

function ArrowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between w-full sm:w-[212px] pb-2.5 transition-colors hover:border-white/40"
      style={{ borderBottom: `1px solid ${HAIR}` }}
    >
      <span className="text-[13px] tracking-[0.02em]" style={{ color: CHALK }}>
        {label}
      </span>
      <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden>
        <path
          d="M0 5h11M8 1.6L11.6 5 8 8.4"
          stroke="#D8D8D8"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  )
}

export default function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section data-snap className="relative w-full overflow-hidden" style={{ minHeight: '100svh' }}>
      <Streaks variant={0} />

      {/* 3D 오브젝트 — 모바일에선 텍스트 뒤로 깔고, lg에서 우측에 세운다 */}
      <div className="absolute inset-x-0 top-[22%] h-[46%] opacity-45 lg:opacity-100 lg:inset-x-auto lg:right-[6%] lg:top-1/2 lg:-translate-y-1/2 lg:w-[46vw] lg:max-w-[640px] lg:h-[46vw] lg:max-h-[640px]">
        <HeroSprout className="w-full h-full" />
      </div>

      <div className="relative z-10 pointer-events-none flex flex-col justify-center px-5 sm:px-8 pt-24 pb-32 lg:pt-0 lg:pb-0 lg:min-h-[calc(100svh-96px)]">
        <h1
          className="text-[clamp(38px,7.4vw,82px)] font-normal tracking-[-0.045em] max-w-[15ch]"
          style={{ color: CHALK, lineHeight: 1.122 }}
        >
          화면을 덜 볼수록
          <br />더 자라납니다.
        </h1>

        <div className="pointer-events-auto flex flex-col sm:flex-row gap-4 sm:gap-4 mt-9 sm:mt-10 max-w-[440px]">
          <ArrowLink href={ctaHref} label="스크린타임 분석" />
          <ArrowLink href="#analysis" label="3분 데모 보기" />
        </div>
      </div>

      {/* 우하단 정보 카드 */}
      <div className="absolute right-5 sm:right-8 bottom-24 lg:bottom-36 z-10 pointer-events-none hidden md:flex flex-col gap-4 w-[232px]">
        <div className="flex items-stretch rounded" style={{ border: `1px solid ${HAIR}` }}>
          <div
            className="flex flex-col items-center justify-center gap-1.5 w-[78px] shrink-0 py-3"
            style={{ borderRight: `1px solid ${HAIR}` }}
          >
            <svg width="21" height="21" viewBox="0 0 22 22" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="8.4" stroke="#D8D8D8" strokeWidth="1.1" />
              <ellipse cx="11" cy="11" rx="3.6" ry="8.4" stroke="#D8D8D8" strokeWidth="1.1" />
              <path d="M2.6 11h16.8" stroke="#D8D8D8" strokeWidth="1.1" />
            </svg>
            <span className="text-[11px] font-semibold tracking-[0.02em]" style={{ color: CHALK }}>
              EST. 2026
            </span>
          </div>
          <p
            className="flex items-center px-3.5 py-3 text-[11px] font-semibold leading-[15px]"
            style={{ color: CHALK }}
          >
            AI가 읽는 스크린타임,
            <br />
            매일 자라는 정원.
          </p>
        </div>
        <p className="text-[15px] leading-6 tracking-[-0.02em]" style={{ color: CHALK }}>
          스크린샷 한 장으로 습관을 읽고, 줄인 시간만큼 식물과 동물이 자랍니다.
        </p>
      </div>

      {/* 하단 안내 */}
      <div className="absolute inset-x-0 bottom-10 z-10 pointer-events-none flex flex-col items-center gap-1">
        <span className="text-[13px] font-medium tracking-[0.03em]" style={{ color: MIST }}>
          움직여서 새싹을 기울여 보세요
        </span>
        <span className="text-[13px] font-medium tracking-[0.03em]" style={{ color: MIST }}>
          스크롤하면 정원이 열립니다
        </span>
      </div>

      <div
        aria-hidden
        className="absolute left-5 sm:left-8 bottom-10 z-10 w-6 h-6 rounded-full hidden sm:block"
        style={{ border: `1px solid ${HAIR}` }}
      />
    </section>
  )
}
