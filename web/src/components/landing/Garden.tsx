'use client'

import SectionShell, { SectionLabel, CHALK, MIST, BLOOM } from './SectionShell'
import HeroSprout from '@/components/hero/HeroSprout'
import BloomGlow from './BloomGlow'

/* 04 — 반려 정원. 단계·누적 분은 .claude/rules/gamification.md의 실제 값이다. */
const STAGES = [
  { name: '씨앗', min: '0 min' },
  { name: '새싹', min: '120 min' },
  { name: '어린 식물', min: '480 min' },
  { name: '꽃봉오리', min: '1,200 min · 현재', now: true },
  { name: '활짝 꽃', min: '2,400 min' },
  { name: '열매', min: '4,800 min' },
  { name: '고목나무', min: '9,600 min' },
]
const NOW = STAGES.findIndex((s) => s.now)

export default function Garden() {
  return (
    <SectionShell variant={1} index={4} indexAlign="right">
      <div className="flex flex-col gap-16 lg:gap-24">
        <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
          <div className="flex flex-col gap-6 lg:gap-7 lg:w-[48%] shrink-0">
            <SectionLabel>반려 정원</SectionLabel>
            <h2
              className="text-[clamp(30px,4.4vw,56px)] font-semibold tracking-[-0.035em]"
              style={{ color: CHALK, lineHeight: 1.3214 }}
            >
              줄인 시간만큼,
              <br />
              정말로 <span style={{ color: BLOOM }}>자랍니다.</span>
            </h2>
            <p
              className="text-[15px] sm:text-[16px] tracking-[-0.02em] max-w-[420px] break-keep"
              style={{ color: MIST, lineHeight: 1.68 }}
            >
              디톡스한 시간이 그대로 경험치가 됩니다. 씨앗에서 고목나무까지 7단계, 되돌아가는 일은
              없습니다. 매일 분석하면 반려 동물의 연속 기록도 함께 쌓입니다.
            </p>
          </div>
          <div className="relative flex-1 h-[300px] sm:h-[400px] lg:h-[460px]">
            <BloomGlow className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(820px,130vw)] aspect-square" />
            <HeroSprout className="w-full h-full" />
          </div>
        </div>

        {/* 성장 로드맵 — 칸마다 윗선을 그어 lg의 7열에서 한 줄 레일로 이어진다 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-y-8 gap-x-4">
          {STAGES.map((s, i) => {
            const done = i < NOW
            const now = i === NOW
            const last = i === STAGES.length - 1
            return (
              <div key={s.name} className="relative flex flex-col gap-1.5 pt-6">
                <span
                  aria-hidden
                  className={`absolute top-0 left-0 right-0 h-px ${last ? '' : 'lg:-right-4'}`}
                  style={{ background: done ? 'rgba(61,219,135,0.75)' : 'rgba(216,216,216,0.12)' }}
                />
                <span
                  aria-hidden
                  className={`absolute rounded-full ${
                    now ? '-left-0.5 -top-1 w-[9px] h-[9px]' : 'left-0 -top-0.5 w-[5px] h-[5px]'
                  }`}
                  style={
                    now
                      ? {
                          background: BLOOM,
                          boxShadow: '0 0 0 5px rgba(61,219,135,0.16), 0 0 18px rgba(61,219,135,0.9)',
                        }
                      : { background: done ? BLOOM : 'rgba(216,216,216,0.22)' }
                  }
                />
                <span
                  className="text-[15px] sm:text-[16px] font-semibold"
                  style={{ color: now ? BLOOM : done ? CHALK : 'rgba(216,216,216,0.5)' }}
                >
                  {s.name}
                </span>
                <span
                  className="font-display text-[12px]"
                  style={{ color: now ? 'rgba(61,219,135,0.62)' : MIST }}
                >
                  {s.min}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </SectionShell>
  )
}
