'use client'

import SectionShell, { SectionLabel, CHALK, MIST, BLOOM } from './SectionShell'
import { RevealLines, RevealUp } from './Reveal'

/* 1년 12칸 중 2칸 — "두 달"을 숫자가 아니라 면적으로 보여준다 */
function YearBars() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div aria-hidden className="flex items-end gap-1.5 sm:gap-2 h-9 sm:h-12">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="flex-1 h-full rounded-[4px]"
            style={
              i >= 10
                ? { background: BLOOM, boxShadow: '0 0 18px rgba(61,219,135,0.45)' }
                : { background: 'rgba(216,216,216,0.08)' }
            }
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[12px] sm:text-[13px] font-semibold tracking-[0.02em]">
        <span style={{ color: MIST }}>1년 · 12개월</span>
        <span style={{ color: BLOOM }}>그중 두 달은 화면 앞</span>
      </div>
    </div>
  )
}

/* 02 — 문제.
   인용 통계가 아니라 산수를 쓴다: 하루 4시간 × 365일 = 1,460시간 ≈ 두 달.
   출처 없는 수치를 사실처럼 적지 않기 위해서다. */
export default function Problem() {
  return (
    <SectionShell variant={2} index={2} indexAlign="left">
      {/* 깨진 화면 에코 — Paper 시안과 같은 30% 잔상. 투명 배경 에셋이라 마스크가 필요 없다.
          lg 미만에선 숨기므로 lazy — display:none 안의 lazy 이미지는 받지 않는다.
          부유는 CSS(자식), 위치는 부모 — 같은 요소의 transform을 두고 싸우지 않게 분리한다 */}
      <div
        aria-hidden
        className="hidden lg:block absolute right-[-3%] top-1/2 -translate-y-1/2 w-[min(660px,46vw)] aspect-square opacity-30 pointer-events-none"
      >
        <div className="offlo-float-c w-full h-full">
          <img
            src="/problem-shatter.avif"
            alt=""
            loading="lazy"
            draggable={false}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="flex flex-col gap-10 lg:gap-14">
        <SectionLabel>문제</SectionLabel>

        <RevealUp className="flex items-baseline gap-3 sm:gap-4">
          <span
            className="font-display text-[clamp(72px,15.5vw,208px)] font-semibold tracking-[-0.05em]"
            style={{ color: CHALK, lineHeight: 1 }}
          >
            1,460
          </span>
          <span
            className="text-[clamp(20px,3.2vw,44px)] font-semibold tracking-[-0.03em]"
            style={{ color: BLOOM }}
          >
            시간
          </span>
        </RevealUp>

        <div className="flex flex-col gap-5 max-w-[560px]">
          <RevealLines
            lines={['하루 4시간이면 1년에 1,460시간.', '두 달을 화면 앞에서 보내는 셈입니다.']}
            className="text-[clamp(19px,2.2vw,28px)] font-semibold tracking-[-0.03em]"
            style={{ color: CHALK, lineHeight: 1.5 }}
          />
          <p
            className="text-[15px] sm:text-[16px] tracking-[-0.02em] max-w-[440px] break-keep"
            style={{ color: MIST, lineHeight: 1.625 }}
          >
            문제는 시간이 아니라, 얼마나 쓰는지 스스로 모른다는 것입니다. Offlo는 거기서부터
            시작합니다.
          </p>
          <RevealUp delay={0.15} className="pt-3 sm:pt-5">
            <YearBars />
          </RevealUp>
        </div>
      </div>
    </SectionShell>
  )
}
