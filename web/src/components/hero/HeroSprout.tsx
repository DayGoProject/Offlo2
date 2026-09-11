'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useScroll, useReducedMotion } from 'framer-motion'

/* ── 히어로 오브젝트 ─────────────────────────────────────────────
   렌더 이미지 + CSS 3D 변환. 선택 근거는 .claude/rules/3d.md 참고.

   이미지 배경은 페이지 배경(#040508)과 같은 색으로 구워져 있다.
   마스크도 알파 채널도 blend 모드도 필요 없다 — 경계가 애초에 없다.
   **페이지 배경색을 바꾸면 이미지를 다시 구워야 한다.**

   움직임을 두 층으로 나눈 이유 —
   상시 흔들림을 JS(rAF)로 돌리면 프레임 루프가 멈춘 환경에서 통째로 죽는다.
   그래서 상시 움직임은 CSS 키프레임(컴포지터 구동)에 맡기고,
   입력에 반응하는 부분만 Framer가 맡는다. 둘은 같은 요소의 transform을
   두고 싸우므로 반드시 부모/자식으로 분리한다.

     바깥 motion.div  → 포인터 틸트 + 스크롤 시차 (Framer)
     안쪽 div         → 상시 부유·회전 (.offlo-sprout-float, CSS)
   ──────────────────────────────────────────────────────────── */

const SRC = '/hero-sprout.webp'

export default function HeroSprout({ className = '' }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  /* 포인터 추종 */
  const pxRaw = useMotionValue(0)
  const pyRaw = useMotionValue(0)
  const rotY = useSpring(pxRaw, { stiffness: 90, damping: 20, mass: 0.6 })
  const rotX = useSpring(pyRaw, { stiffness: 90, damping: 20, mass: 0.6 })

  /* 스크롤 시차 — 글로우와 본체가 다른 속도로 움직여 깊이를 만든다 */
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start end', 'end start'] })
  const bodyY = useTransform(scrollYProgress, [0, 1], [60, -96])
  const glowY = useTransform(scrollYProgress, [0, 1], [26, -40])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.92])

  return (
    <div
      ref={wrap}
      className={`relative select-none ${className}`}
      style={{ perspective: 1200 }}
      onPointerMove={(e) => {
        if (reduced) return
        const r = e.currentTarget.getBoundingClientRect()
        pxRaw.set(((e.clientX - r.left) / r.width - 0.5) * -26)
        pyRaw.set(((e.clientY - r.top) / r.height - 0.5) * 18)
      }}
      onPointerLeave={() => {
        pxRaw.set(0)
        pyRaw.set(0)
      }}
    >
      {/* 글로우 — 본체보다 느리게 움직인다 */}
      <motion.div
        aria-hidden
        className="absolute pointer-events-none offlo-glow-pulse"
        style={{
          inset: '2% 4%',
          y: reduced ? 0 : glowY,
          background:
            'radial-gradient(circle at 50% 50%, rgba(61,219,135,0.20) 0%, rgba(61,219,135,0.06) 40%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />

      <motion.div
        className="relative w-full h-full"
        style={{
          rotateX: reduced ? 0 : rotX,
          rotateY: reduced ? 0 : rotY,
          y: reduced ? 0 : bodyY,
          scale: reduced ? 1 : scale,
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="offlo-sprout-float w-full h-full">
          <img
            src={SRC}
            alt=""
            aria-hidden
            draggable={false}
            className="w-full h-full object-contain"
          />
        </div>
      </motion.div>
    </div>
  )
}
