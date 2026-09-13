'use client'

import SectionShell, { SectionLabel, CHALK, MIST, HAIR } from './SectionShell'

/* 05 — 크롬 확장 프로그램. 차단 오버레이 목업. */
export default function Extension() {
  return (
    <SectionShell variant={2} index={5} indexAlign="right">
      <div className="flex flex-col lg:flex-row-reverse lg:items-center gap-14 lg:gap-20">
        <div className="flex flex-col gap-6 lg:gap-7 lg:w-[38%] shrink-0">
          <SectionLabel>크롬 확장 프로그램</SectionLabel>
          <h2
            className="text-[clamp(30px,4.2vw,52px)] font-normal tracking-[-0.04em]"
            style={{ color: CHALK, lineHeight: 1.3462 }}
          >
            브라우저에서
            <br />
            바로 막습니다.
          </h2>
          <p
            className="text-[15px] sm:text-[16px] tracking-[-0.02em]"
            style={{ color: MIST, lineHeight: 1.68 }}
          >
            차단할 사이트를 등록하고 디톡스 세션을 시작하면, 세션이 끝날 때까지 접속이 막힙니다.
            버틴 시간은 그대로 식물의 경험치가 됩니다.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <span
              className="flex items-center px-4 h-9 rounded-full bg-white text-[13px] font-semibold"
              style={{ color: '#040508' }}
            >
              확장 프로그램 설치
            </span>
            <span className="font-display text-[12px]" style={{ color: MIST }}>
              Chrome 120+
            </span>
          </div>
        </div>

        {/* 브라우저 창 */}
        <div
          className="flex-1 rounded-xl overflow-hidden lg:rotate-[1.8deg] lg:skew-y-[-0.9deg]"
          style={{
            background: '#0B0D11',
            border: `1px solid rgba(216,216,216,0.11)`,
            boxShadow: '0 44px 100px rgba(0,0,0,0.72)',
          }}
        >
          <div
            className="flex items-center gap-3.5 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(216,216,216,0.08)' }}
          >
            <div className="flex gap-1.5 shrink-0">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-[9px] h-[9px] rounded-full"
                  style={{ background: 'rgba(216,216,216,0.2)' }}
                />
              ))}
            </div>
            <div
              className="flex-1 flex items-center h-[26px] px-3 rounded-full"
              style={{ background: 'rgba(216,216,216,0.05)' }}
            >
              <span className="font-display text-[11px]" style={{ color: MIST }}>
                instagram.com
              </span>
            </div>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="10" r="8.4" stroke="#3DDB87" strokeWidth="1.2" />
              <circle cx="10" cy="10" r="2.6" fill="#3DDB87" />
            </svg>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 sm:py-20">
            <svg width="42" height="42" viewBox="0 0 44 44" fill="none" aria-hidden>
              <circle cx="22" cy="22" r="20" stroke="#3DDB87" strokeWidth="1.4" strokeOpacity="0.55" />
              <path d="M8 8l28 28" stroke="#3DDB87" strokeWidth="1.4" strokeOpacity="0.55" strokeLinecap="round" />
            </svg>
            <p className="text-[22px] sm:text-[24px] font-medium tracking-[-0.02em]" style={{ color: CHALK }}>
              지금은 디톡스 중입니다
            </p>
            <p className="text-[14px]" style={{ color: MIST }}>
              세션이 끝나면 다시 열 수 있어요.
            </p>
            <div className="flex items-baseline gap-2 pt-2">
              <span
                className="font-display text-[clamp(38px,5vw,52px)] font-normal tracking-[-0.04em]"
                style={{ color: '#3DDB87', lineHeight: 1 }}
              >
                18:42
              </span>
              <span className="text-[13px]" style={{ color: MIST }}>
                남음
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="w-[5px] h-[5px] rounded-full" style={{ background: '#3DDB87' }} />
              <span className="text-[12px]" style={{ color: 'rgba(61,219,135,0.78)' }}>
                버틴 시간 +42분이 식물에 적립됩니다
              </span>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
