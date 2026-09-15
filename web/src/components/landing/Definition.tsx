'use client'

import { useRef } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion'
import SectionShell, { SectionLabel, CHALK, MIST, BLOOM } from './SectionShell'
import { RevealUp } from './Reveal'

/* 01 — 정의. 스크롤에 따라 흐린 줄이 차례로 선명해진다. */
const LINES = [
  'Offlo는 스크린타임 스크린샷 한 장을',
  'AI로 읽어 습관을 분석하고, 줄인 시간만큼',
  '반려 식물과 동물이 자라는 디지털 디톡스 앱입니다.',
]

/* 문장을 실제 사용 흐름 3단계로 풀어 준다 */
const STEPS = [
  { n: '01', title: '캡처', desc: '설정 앱의 스크린타임 화면을 한 장 찍어 올립니다.' },
  { n: '02', title: 'AI 분석', desc: '앱별 사용 패턴과 중독 신호를 읽어 전략을 돌려줍니다.' },
  { n: '03', title: '성장', desc: '줄인 시간만큼 반려 식물과 동물이 자랍니다.' },
]

/* 훅을 map 안에서 부르지 않으려고 줄 단위 컴포넌트로 분리한다. */
function Line({
  text,
  index,
  progress,
  reduced,
}: {
  text: string
  index: number
  progress: MotionValue<number>
  reduced: boolean | null
}) {
  const start = index * 0.26
  const opacity = useTransform(progress, [start, start + 0.34], [0.18, 1])
  return (
    <motion.span
      className="text-[clamp(24px,3.9vw,56px)] font-semibold tracking-[-0.035em] break-keep"
      style={{ color: CHALK, lineHeight: 1.4286, opacity: reduced ? 1 : opacity }}
    >
      {text}
    </motion.span>
  )
}

export default function Definition() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'start 0.25'] })

  return (
    <SectionShell
      variant={1}
      index={1}
      indexAlign="left"
      glow="right-[-14%] bottom-[-18%] w-[min(640px,110vw)] aspect-square"
    >
      <div ref={ref} className="flex flex-col gap-8 lg:gap-9">
        <SectionLabel>소개</SectionLabel>
        <div className="flex flex-col">
          {LINES.map((line, i) => (
            <Line key={line} text={line} index={i} progress={scrollYProgress} reduced={reduced} />
          ))}

          <RevealUp delay={0.1} className="w-full max-w-[820px] mt-12 lg:mt-24">
            <div aria-hidden className="relative h-px" style={{ background: 'rgba(216,216,216,0.12)' }}>
              <span className="absolute left-0 top-0 h-px w-1/3" style={{ background: BLOOM }} />
              <span
                className="absolute -left-[3px] -top-[3px] w-[7px] h-[7px] rounded-full"
                style={{ background: BLOOM, boxShadow: '0 0 12px rgba(61,219,135,0.8)' }}
              />
            </div>
            <ol className="grid grid-cols-3 pt-5 sm:pt-[26px]">
              {STEPS.map((s, i) => (
                <li key={s.n} className="flex flex-col gap-1.5 sm:gap-2.5 pr-3 sm:pr-8">
                  <span
                    className="font-display text-[12px] sm:text-[13px] font-semibold tracking-[0.02em]"
                    style={{ color: i === 0 ? BLOOM : MIST }}
                  >
                    {s.n}
                  </span>
                  <span
                    className="text-[17px] sm:text-[22px] font-semibold tracking-[-0.03em]"
                    style={{ color: CHALK, lineHeight: 1.36 }}
                  >
                    {s.title}
                  </span>
                  {/* 360px에서 3열이 버티도록 설명은 sm부터 */}
                  <p
                    className="hidden sm:block text-[15px] tracking-[-0.02em] break-keep"
                    style={{ color: MIST, lineHeight: 1.6 }}
                  >
                    {s.desc}
                  </p>
                </li>
              ))}
            </ol>
          </RevealUp>
        </div>
      </div>
    </SectionShell>
  )
}
