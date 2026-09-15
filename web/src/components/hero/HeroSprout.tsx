'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useScroll, useReducedMotion } from 'framer-motion'

/* ── 히어로 오브젝트 ─────────────────────────────────────────────
   렌더 이미지 + CSS 3D 변환. 선택 근거는 .claude/rules/3d.md 참고.

   이미지는 **투명 배경(알파)** 이다. Paper 원본 렌더(검은 배경)를 "검정 → 투명"으로
   되돌려 뽑았으므로 어떤 배경·글로우·패럴랙스 위에 얹어도 사각형 경계가 생기지 않는다.
   (예전엔 페이지색을 구운 불투명 이미지였고, 뒤로 지나가는 것을 사각형으로 가렸다 — 3d.md)

   움직임을 두 층으로 나눈 이유 —
   상시 흔들림을 JS(rAF)로 돌리면 프레임 루프가 멈춘 환경에서 통째로 죽는다.
   그래서 상시 움직임은 CSS 키프레임(컴포지터 구동)에 맡기고,
   입력에 반응하는 부분만 Framer가 맡는다. 둘은 같은 요소의 transform을
   두고 싸우므로 반드시 부모/자식으로 분리한다.

     바깥 motion.div  → 포인터 틸트 + 스크롤 시차 (Framer)
     안쪽 div         → 상시 부유·회전 (.offlo-sprout-float, CSS)
   ──────────────────────────────────────────────────────────── */

/* AVIF — 옅은 안개의 낮은 알파값을 보존한다. WebP는 알파 품질을 낮추면 안개가 계단으로
   뭉개져 윤곽선이 생기고, 무손실 알파는 120 kB가 된다 (3d.md) */
const SRC = '/hero-sprout.avif'

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
