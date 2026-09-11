'use client'

import SectionShell, { SectionLabel, CHALK, MIST } from './SectionShell'
import { RevealLines, RevealUp } from './Reveal'

/* 02 — 문제.
   인용 통계가 아니라 산수를 쓴다: 하루 4시간 × 365일 = 1,460시간 ≈ 두 달.
   출처 없는 수치를 사실처럼 적지 않기 위해서다. */
export default function Problem() {
  return (
    <SectionShell variant={2} index={2} indexAlign="left">
      <div className="flex flex-col gap-10 lg:gap-14">
        <SectionLabel>문제</SectionLabel>

        <RevealUp className="flex items-baseline gap-3 sm:gap-4">
          <span
            className="font-display text-[clamp(72px,15.5vw,208px)] font-normal tracking-[-0.055em]"
            style={{ color: CHALK, lineHeight: 1 }}
          >
            1,460
          </span>
          <span
            className="text-[clamp(20px,3.2vw,44px)] font-normal tracking-[-0.03em]"
            style={{ color: 'rgba(216,216,216,0.4)' }}
          >
            시간
          </span>
        </RevealUp>

        <div className="flex flex-col gap-5 max-w-[560px]">
          <RevealLines
            lines={['하루 4시간이면 1년에 1,460시간.', '두 달을 화면 앞에서 보내는 셈입니다.']}
            className="text-[clamp(19px,2.2vw,28px)] font-normal tracking-[-0.03em]"
            style={{ color: CHALK, lineHeight: 1.5 }}
          />
          <p
            className="text-[15px] sm:text-[16px] tracking-[-0.02em] max-w-[440px]"
            style={{ color: MIST, lineHeight: 1.625 }}
          >
            문제는 시간이 아니라, 얼마나 쓰는지 스스로 모른다는 것입니다. Offlo는 거기서부터
            시작합니다.
          </p>
        </div>
      </div>
    </SectionShell>
  )
}
