'use client'

import Link from 'next/link'

/* 상단 바 — 네비게이션 링크는 두지 않는다. 로고 · 사운드 · CTA · 메뉴만. */
export default function TopBar({ ctaHref }: { ctaHref: string }) {
  return (
    <header className="relative z-20 flex items-center justify-between w-full px-5 sm:px-8 py-5 sm:py-7">
      <Link href="/" className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="10" stroke="#D8D8D8" strokeWidth="1.3" />
          <circle cx="11" cy="11" r="3.1" fill="#3DDB87" />
        </svg>
        <span
          className="text-[17px] sm:text-[19px] font-semibold tracking-[-0.03em]"
          style={{ color: '#D8D8D8' }}
        >
          OFFLO
        </span>
        <span className="text-[9px]" style={{ color: 'rgba(216,216,216,0.45)' }}>
          ®
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="사운드 켜기"
          className="hidden sm:flex items-center justify-center w-[30px] h-[30px] rounded-full transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(216,216,216,0.22)' }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M6.2 2.4L3.4 4.9H1.4v4.2h2l2.8 2.5V2.4z" fill="#D8D8D8" opacity="0.75" />
            <path
              d="M9.2 5.2l3.4 3.6M12.6 5.2L9.2 8.8"
              stroke="#D8D8D8"
              strokeOpacity="0.75"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <Link
          href={ctaHref}
          className="flex items-center px-4 sm:px-5 h-9 rounded-full bg-white text-[13px] font-semibold tracking-[0.02em] transition-opacity hover:opacity-90"
          style={{ color: '#040508' }}
        >
          지금 시작하기
        </Link>

        <button
          type="button"
          className="flex items-center gap-3 pl-5 pr-4 h-9 rounded-full text-[13px] font-medium transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(216,216,216,0.22)', color: '#D8D8D8' }}
        >
          메뉴
          <svg width="13" height="8" viewBox="0 0 13 8" fill="none" aria-hidden>
            <path d="M0 1h13M0 7h13" stroke="#D8D8D8" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
    </header>
  )
}
