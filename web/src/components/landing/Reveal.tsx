'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

/* ── 텍스트/요소 리빌 ────────────────────────────────────────────
   라인 단위로 clip 마스크 뒤에서 올라온다. overflow-hidden 래퍼 +
   y 오프셋 조합이 clip-path보다 싸고, 서브픽셀 렌더링도 깨지지 않는다.
   ──────────────────────────────────────────────────────────── */

const EASE = [0.16, 1, 0.3, 1] as const

export function RevealLines({
  lines,
  className = '',
  style,
  delay = 0,
}: {
  lines: string[]
  className?: string
  style?: React.CSSProperties
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-12% 0px' })
  const reduced = useReducedMotion()

  return (
    <div ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <span key={line + i} className="block overflow-hidden">
          <motion.span
            className="block"
            initial={reduced ? undefined : { y: '105%' }}
            animate={reduced || inView ? { y: '0%' } : undefined}
            transition={{ duration: 0.95, delay: delay + i * 0.11, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </div>
  )
}

/* 요소 하나를 아래에서 밀어 올린다 */
export function RevealUp({
  children,
  delay = 0,
  className = '',
  style,
}: {
  children: ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduced = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={reduced ? undefined : { opacity: 0, y: 26 }}
      animate={reduced || inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* 이미지·카드 스케일 인 — 1.08에서 1로 */
export function RevealScale({
  children,
  delay = 0,
  className = '',
  style,
}: {
  children: ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-8% 0px' })
  const reduced = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={reduced ? undefined : { opacity: 0, scale: 1.08 }}
      animate={reduced || inView ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
