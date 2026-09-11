'use client'

import SectionShell, { SectionLabel, CHALK, MIST, HAIR } from './SectionShell'
import HeroSprout from '@/components/hero/HeroSprout'

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

export default function Garden() {
  return (
    <SectionShell variant={1} index={4} indexAlign="right">
      <div className="flex flex-col gap-16 lg:gap-24">
        <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
          <div className="flex flex-col gap-6 lg:gap-7 lg:w-[48%] shrink-0">
            <SectionLabel>반려 정원</SectionLabel>
            <h2
              className="text-[clamp(30px,4.4vw,56px)] font-normal tracking-[-0.04em]"
              style={{ color: CHALK, lineHeight: 1.3214 }}
            >
              줄인 시간만큼,
              <br />
              정말로 자랍니다.
            </h2>
            <p
              className="text-[15px] sm:text-[16px] tracking-[-0.02em] max-w-[420px]"
              style={{ color: MIST, lineHeight: 1.68 }}
            >
              디톡스한 시간이 그대로 경험치가 됩니다. 씨앗에서 고목나무까지 7단계, 되돌아가는 일은
              없습니다. 매일 분석하면 반려 동물의 연속 기록도 함께 쌓입니다.
            </p>
          </div>
          <div className="flex-1 h-[300px] sm:h-[400px] lg:h-[460px]">
            <HeroSprout className="w-full h-full" />
          </div>
        </div>

        {/* 성장 로드맵 */}
        <div className="flex flex-col gap-5">
          <div className="w-full h-px" style={{ background: 'rgba(216,216,216,0.12)' }} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-y-6 gap-x-4">
            {STAGES.map((s) => (
              <div key={s.name} className="flex flex-col gap-1.5">
                <span
                  className="text-[14px] font-medium"
                  style={{ color: s.now ? '#3DDB87' : 'rgba(216,216,216,0.72)' }}
                >
                  {s.name}
                </span>
                <span
                  className="font-display text-[11px]"
                  style={{ color: s.now ? 'rgba(61,219,135,0.62)' : MIST }}
                >
                  {s.min}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
