'use client'

import SectionShell, { SectionLabel, CHALK, MIST } from './SectionShell'
import { RevealLines, RevealScale } from './Reveal'

const APPS = [
  { name: '인스타그램', pct: 72, time: '1h 42m', alpha: 1 },
  { name: '유튜브', pct: 55, time: '1h 18m', alpha: 0.72 },
  { name: '카카오톡', pct: 34, time: '48m', alpha: 0.46 },
  { name: '기타', pct: 16, time: '24m', alpha: 0.28 },
]

/* 03 — AI 분석. 카드 데이터는 실제 analyses 스키마(apps · detoxScore)를 따른다. */
export default function Analysis() {
  return (
    <SectionShell variant={0} index={3} indexAlign="left">
      <div className="flex flex-col lg:flex-row lg:items-center gap-14 lg:gap-20">
        <div className="flex flex-col gap-6 lg:gap-7 lg:w-[46%] shrink-0">
          <SectionLabel>AI 분석</SectionLabel>
          <RevealLines
            lines={['스크린샷 한 장이면', '충분합니다.']}
            className="text-[clamp(30px,4.4vw,56px)] font-normal tracking-[-0.04em]"
            style={{ color: CHALK, lineHeight: 1.3214 }}
          />
          <p
            className="text-[15px] sm:text-[16px] tracking-[-0.02em] max-w-[400px]"
            style={{ color: MIST, lineHeight: 1.68 }}
          >
            설정 화면을 캡처해 올리면 Gemini가 앱별 사용 패턴을 읽고, 중독 신호와 개선 방향을
            정리해 돌려줍니다. 이미지는 분석 즉시 폐기됩니다.
          </p>
        </div>

        {/* 분석 결과 카드 — 원근을 준 판 */}
        <RevealScale
          className="flex-1 rounded-xl p-6 sm:p-7 lg:rotate-[-2.4deg] lg:skew-y-[1.2deg]"
          style={{
            background: '#0B0D11',
            border: '1px solid rgba(216,216,216,0.10)',
            boxShadow: '0 40px 90px rgba(0,0,0,0.7)',
          }}
        >
          <div
            className="flex items-center justify-between pb-5"
            style={{ borderBottom: '1px solid rgba(216,216,216,0.08)' }}
          >
            <span className="text-[13px] font-medium" style={{ color: MIST }}>
              2026. 09. 08 · 일간 분석
            </span>
            <span
              className="flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(61,219,135,0.13)', color: '#3DDB87' }}
            >
              분석 완료
            </span>
          </div>

          <div className="flex items-baseline gap-3 pt-5 pb-6">
            <span
              className="font-display text-[clamp(38px,4.6vw,56px)] font-normal tracking-[-0.05em]"
              style={{ color: CHALK, lineHeight: 1 }}
            >
              4<span className="text-[0.54em]">h</span> 12<span className="text-[0.54em]">m</span>
            </span>
            <span className="text-[13px] font-medium" style={{ color: 'rgba(61,219,135,0.9)' }}>
              어제보다 38분 ↓
            </span>
          </div>

          <div className="flex flex-col gap-3.5 pb-6">
            {APPS.map((a) => (
              <div key={a.name} className="flex items-center gap-3.5">
                <span className="w-[76px] sm:w-[86px] shrink-0 text-[13px]" style={{ color: CHALK }}>
                  {a.name}
                </span>
                <div
                  className="flex-1 h-[5px] rounded-full"
                  style={{ background: 'rgba(216,216,216,0.07)' }}
                >
                  <div
                    className="h-[5px] rounded-full"
                    style={{ width: `${a.pct}%`, background: `rgba(61,219,135,${a.alpha})` }}
                  />
                </div>
                <span
                  className="font-display w-[52px] shrink-0 text-right text-[12px] font-medium"
                  style={{ color: MIST }}
                >
                  {a.time}
                </span>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col gap-4 pt-5"
            style={{ borderTop: '1px solid rgba(216,216,216,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium" style={{ color: MIST }}>
                디톡스 점수
              </span>
              <div className="flex items-center gap-3.5">
                <div
                  className="w-[130px] sm:w-[190px] h-[5px] rounded-full"
                  style={{ background: 'rgba(216,216,216,0.07)' }}
                >
                  <div className="w-[74%] h-[5px] rounded-full" style={{ background: '#3DDB87' }} />
                </div>
                <span
                  className="font-display text-[22px] font-medium tracking-[-0.02em]"
                  style={{ color: CHALK }}
                >
                  74
                </span>
              </div>
            </div>
            <p
              className="px-4 py-3.5 rounded-lg text-[12px] leading-[19px]"
              style={{
                background: 'rgba(61,219,135,0.055)',
                border: '1px solid rgba(61,219,135,0.14)',
                color: 'rgba(216,216,216,0.72)',
              }}
            >
              밤 11시 이후 인스타그램 사용이 전체의 44%입니다. 취침 1시간 전 알림을 끄는 것부터
              시작해 보세요.
            </p>
          </div>
        </RevealScale>
      </div>
    </SectionShell>
  )
}
