'use client'

import { useRef } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion'
import SectionShell, { SectionLabel, CHALK } from './SectionShell'

/* 01 — 정의. 스크롤에 따라 흐린 줄이 차례로 선명해진다. */
const LINES = [
  'Offlo는 스크린타임 스크린샷 한 장을',
  'AI로 읽어 습관을 분석하고, 줄인 시간만큼',
  '반려 식물과 동물이 자라는 디지털 디톡스 앱입니다.',
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
      className="text-[clamp(24px,3.9vw,56px)] font-normal tracking-[-0.04em]"
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
    <SectionShell variant={1} index={1} indexAlign="left">
      <div ref={ref} className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16">
        <div className="lg:pt-5 shrink-0">
          <SectionLabel>소개</SectionLabel>
        </div>
        <div className="flex flex-col">
          {LINES.map((line, i) => (
            <Line key={line} text={line} index={i} progress={scrollYProgress} reduced={reduced} />
          ))}
        </div>
      </div>
    </SectionShell>
  )
}
