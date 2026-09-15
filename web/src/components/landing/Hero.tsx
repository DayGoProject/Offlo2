'use client'

import Link from 'next/link'
import HeroSprout from '@/components/hero/HeroSprout'
import Streaks from './Streaks'
import BloomGlow from './BloomGlow'
import { CHALK, MIST, HAIR, BLOOM } from './tokens'

/* 과장 수치 대신 제품 사실만 쓴다 — 단계 수는 gamification.md의 실제 값이다. */
const FACTS = [
  { value: '1', unit: '장', label: '스크린샷이면 분석 끝' },
  { value: '7', unit: '단계', label: '씨앗에서 고목나무까지' },
  { value: '3', unit: '종', label: '고양이 · 강아지 · 토끼' },
]

function ArrowLink({ href, label, accent = false }: { href: string; label: string; accent?: boolean }) {
  const color = accent ? BLOOM : CHALK
  return (
    <Link
      href={href}
      className="flex items-center justify-between w-full sm:w-[212px] pb-2.5 transition-colors hover:border-white/40"
      style={{ borderBottom: `1px solid ${accent ? 'rgba(61,219,135,0.55)' : HAIR}` }}
    >
      <span className="text-[14px] font-semibold tracking-[0.02em]" style={{ color }}>
        {label}
      </span>
      <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden>
        <path
          d="M0 5h11M8 1.6L11.6 5 8 8.4"
          stroke={color}
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
        <BloomGlow className="-inset-[16%]" strength={0.16} />
        <HeroSprout className="w-full h-full" />
      </div>

      <div className="relative z-10 pointer-events-none flex flex-col justify-center px-5 sm:px-8 pt-24 pb-12 lg:pt-0 lg:pb-0 lg:min-h-[calc(100svh-96px)]">
        <div className="flex mb-6 sm:mb-[26px]">
          <span
            className="flex items-center gap-2 h-7 pl-2.5 pr-3 rounded-full"
            style={{ border: '1px solid rgba(61,219,135,0.28)', background: 'rgba(61,219,135,0.07)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: BLOOM, boxShadow: '0 0 10px rgba(61,219,135,0.9)' }}
            />
            <span className="text-[12px] font-semibold tracking-[0.04em]" style={{ color: BLOOM }}>
              AI 디지털 디톡스
            </span>
          </span>
        </div>

        <h1
          className="text-[clamp(38px,7.4vw,82px)] font-semibold tracking-[-0.04em] max-w-[15ch]"
          style={{ color: CHALK, lineHeight: 1.122 }}
        >
          화면을 덜 볼수록
          <br />더 <span style={{ color: BLOOM }}>자라납니다.</span>
        </h1>

        <div className="pointer-events-auto flex flex-col sm:flex-row gap-4 sm:gap-4 mt-9 sm:mt-10 max-w-[440px]">
          <ArrowLink href={ctaHref} label="스크린타임 분석" accent />
          <ArrowLink href="#analysis" label="3분 데모 보기" />
        </div>
      </div>

      {/* 핵심 사실 3개 — 모바일은 흐름 안, lg에선 좌하단에 우측 카드와 바닥선을 맞춘다 */}
      <div className="relative z-10 pointer-events-none px-5 sm:px-8 pb-32 lg:p-0 lg:absolute lg:left-8 lg:bottom-36">
        <ul className="grid grid-cols-3 max-w-[460px] lg:max-w-[520px]">
          {FACTS.map((f, i) => (
            <li
              key={f.unit}
              className={`flex flex-col gap-1.5 ${i === 0 ? 'pr-3 sm:pr-7' : 'px-3 sm:px-7'}`}
              style={i > 0 ? { borderLeft: '1px solid rgba(216,216,216,0.12)' } : undefined}
            >
              <span className="flex items-baseline gap-1">
                <span
                  className="font-display text-[32px] sm:text-[44px] font-semibold tracking-[-0.04em] leading-none"
                  style={{ color: CHALK }}
                >
                  {f.value}
                </span>
                <span className="text-[13px] sm:text-[15px] font-semibold" style={{ color: BLOOM }}>
                  {f.unit}
                </span>
              </span>
              <span
                className="text-[12px] sm:text-[13px] break-keep"
                style={{ color: MIST, lineHeight: '18px' }}
              >
                {f.label}
              </span>
            </li>
          ))}
        </ul>
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
        <p className="text-[15px] leading-6 tracking-[-0.02em] break-keep" style={{ color: CHALK }}>
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
