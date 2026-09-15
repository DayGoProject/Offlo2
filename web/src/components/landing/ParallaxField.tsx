'use client'

import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'framer-motion'

/* ── 전 페이지 공통 패럴랙스 레이어 ──────────────────────────────
   "3D처럼 보이는" 것의 정체는 오브젝트 하나가 회전하는 게 아니라,
   여러 오브젝트가 **서로 다른 속도로** 지나가는 것이다. 깊이가 다르면
   같은 스크롤에도 이동량이 다르고, 뇌는 그걸 공간으로 읽는다.

   레이어는 페이지에 딱 하나만 둔다 (position: fixed). 섹션마다 만들면
   같은 오브젝트가 중복되고 스크롤 계산이 어긋난다.

   depth 0 = 멀다 (느리게·작게·흐리게) → 1 = 가깝다 (빠르게·크게·선명)
   ──────────────────────────────────────────────────────────── */

type Obj = {
  src: string
  /** 뷰포트 기준 위치 (%) */
  x: number
  y: number
  /** 0 = 원경, 1 = 근경 */
  depth: number
  /** px 기준 크기 */
  size: number
  /** 부유 애니메이션 변형 */
  float: 'a' | 'b' | 'c'
  spin?: number
}

const OBJECTS: Obj[] = [
  { src: '/frag-leaf-a.avif', x: 8, y: 18, depth: 0.18, size: 120, float: 'a', spin: -14 },
  { src: '/frag-leaf-b.avif', x: 88, y: 12, depth: 0.26, size: 96, float: 'b', spin: 22 },
  { src: '/frag-stem.avif', x: 72, y: 62, depth: 0.12, size: 90, float: 'c', spin: 8 },
  { src: '/frag-leaf-b.avif', x: 18, y: 74, depth: 0.44, size: 150, float: 'c', spin: -30 },
  { src: '/frag-leaf-a.avif', x: 94, y: 46, depth: 0.58, size: 190, float: 'a', spin: 16 },
  { src: '/frag-stem.avif', x: 4, y: 44, depth: 0.34, size: 120, float: 'b', spin: -6 },
  { src: '/frag-leaf-b.avif', x: 62, y: 88, depth: 0.7, size: 210, float: 'a', spin: 34 },
  { src: '/frag-leaf-a.avif', x: 30, y: 30, depth: 0.08, size: 78, float: 'b', spin: 10 },
]

function Floater({ o, progress }: { o: Obj; progress: MotionValue<number> }) {
  // 근경일수록 많이 움직인다. 화면 높이의 최대 1.6배까지.
  const travel = -(180 + o.depth * 1400)
  const y = useTransform(progress, [0, 1], [0, travel])
  const drift = useTransform(progress, [0, 1], [0, (o.depth - 0.4) * 160])

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${o.x}%`,
        top: `${o.y}%`,
        width: o.size,
        height: o.size,
        y,
        x: drift,
        opacity: 0.1 + o.depth * 0.34,
        filter: `blur(${((1 - o.depth) * 3.2).toFixed(1)}px)`,
      }}
    >
      {/* 회전은 CSS 변수로 넘긴다 — 키프레임이 transform을 통째로 쓰므로
          여기에 transform을 또 걸면 애니메이션이 덮어써 버린다 */}
      <div
        className={`offlo-float-${o.float} w-full h-full`}
        style={{ ['--spin' as string]: `${o.spin ?? 0}deg` }}
      >
        {/* 조각은 원본에서 잘라낸 것이라 글로우가 사각형으로 끊긴다.
            방사형 마스크로 가장자리를 풀어 단면을 지운다. */}
        <img
          src={o.src}
          alt=""
          aria-hidden
          draggable={false}
          className="w-full h-full object-contain"
          style={{
            maskImage: 'radial-gradient(ellipse at 50% 50%, #000 38%, rgba(0,0,0,0.5) 62%, transparent 78%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at 50% 50%, #000 38%, rgba(0,0,0,0.5) 62%, transparent 78%)',
          }}
        />
      </div>
    </motion.div>
  )
}

export default function ParallaxField() {
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()

  if (reduced) return null

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {OBJECTS.map((o, i) => (
        <Floater key={i} o={o} progress={scrollYProgress} />
      ))}
    </div>
  )
}
