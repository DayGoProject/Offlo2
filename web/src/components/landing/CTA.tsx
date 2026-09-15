'use client'

import Link from 'next/link'
import HeroSprout from '@/components/hero/HeroSprout'
import Streaks from './Streaks'
import { CHALK, MIST, HAIR, BLOOM } from './tokens'
import SectionIndex from './SectionIndex'
import BloomGlow from './BloomGlow'

/* 07 — CTA · 푸터. 새싹이 다시 등장하며 마무리한다. */
export default function CTA({ ctaHref }: { ctaHref: string }) {
  return (
    <section data-snap className="relative w-full overflow-hidden flex flex-col justify-center" style={{ minHeight: '100svh' }}>
      <Streaks variant={0} />

      {/* 지평선 글로우 — 새싹 뒤에 깐다 */}
      <BloomGlow
        shape="ellipse"
        strength={0.16}
        className="left-1/2 -translate-x-1/2 top-[46%] w-[min(1200px,160vw)] h-[78%]"
      />

      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 top-4 w-[min(560px,86vw)] h-[min(560px,86vw)] opacity-40 pointer-events-none"
      >
        <HeroSprout className="w-full h-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-9 px-5 sm:px-8 pt-32 sm:pt-44 pb-24 sm:pb-32">
        <h2
          className="text-center text-[clamp(30px,6vw,76px)] font-semibold tracking-[-0.04em] break-keep"
          style={{ color: CHALK, lineHeight: 1.2632 }}
        >
          오늘 하루,
          <br />
          <span style={{ color: BLOOM }}>화면 밖에서</span> 시작해 보세요.
        </h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto max-w-[320px] sm:max-w-none">
          <Link
            href={ctaHref}
            className="flex items-center justify-center px-8 h-[50px] rounded-full text-[15px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: BLOOM, color: '#040508', boxShadow: '0 0 40px rgba(61,219,135,0.35)' }}
          >
            지금 시작하기
          </Link>
          <Link
            href="#analysis"
            className="flex items-center justify-center gap-3 px-7 h-[50px] rounded-full text-[15px] font-semibold transition-colors hover:bg-white/5"
            style={{ border: `1px solid ${HAIR}`, color: CHALK }}
          >
            3분 데모 보기
            <svg width="9" height="10" viewBox="0 0 9 10" fill="none" aria-hidden>
              <path d="M0 0l9 5-9 5V0z" fill="#D8D8D8" />
            </svg>
          </Link>
        </div>

        <p className="text-[13px] text-center" style={{ color: MIST }}>
          스크린샷은 분석 즉시 폐기됩니다
        </p>
      </div>

      <SectionIndex current={6} align="right" />

      {/* 섹션 콘텐츠와 같은 1120px 폭 — 윗선도 그 폭 안에서만 긋는다 */}
      <footer className="relative z-10 px-5 sm:px-8">
        <div
          className="mx-auto w-full max-w-[1120px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 py-8"
          style={{ borderTop: `1px solid rgba(216,216,216,0.09)` }}
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="10" stroke="#D8D8D8" strokeWidth="1.3" />
              <circle cx="11" cy="11" r="3.1" fill="#3DDB87" />
            </svg>
            <span className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: CHALK }}>
              OFFLO
            </span>
            <span className="text-[11px]" style={{ color: MIST }}>
              © 2026
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { label: '이용약관', href: '#' },
              { label: '개인정보처리방침', href: '#' },
              { label: '문의', href: '#' },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[13px] transition-colors hover:text-white"
                style={{ color: MIST }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </section>
  )
}
