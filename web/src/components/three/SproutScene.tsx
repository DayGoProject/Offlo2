'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import GlassSprout, { type Quality } from './GlassSprout'

/* ── 렌더 가능 여부 판정 ─────────────────────────────────────────
   셋 중 하나라도 걸리면 3D를 띄우지 않고 폴백을 보여준다.
     · prefers-reduced-motion  — 스크롤 구동 카메라는 전정기관 장애에 위험하다
     · WebGL 컨텍스트 생성 실패
     · 저사양 기기          — transmission은 장면을 한 번 더 렌더한다
   ──────────────────────────────────────────────────────────── */
type Verdict = { render: boolean; quality: Quality }

function probe(): Verdict {
  if (typeof window === 'undefined') return { render: false, quality: 'low' }

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return { render: false, quality: 'low' }
  }

  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    if (!gl) return { render: false, quality: 'low' }
  } catch {
    return { render: false, quality: 'low' }
  }

  const cores = navigator.hardwareConcurrency ?? 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const narrow = window.matchMedia?.('(max-width: 1023px)').matches ?? false

  // 굴절을 감당 못 하는 조합이면 단순 반사로 떨어뜨린다 (렌더 자체는 유지)
  if (cores <= 4 || mem <= 4 || narrow) return { render: true, quality: 'low' }
  return { render: true, quality: 'high' }
}

/* ── 폴백 ─────────────────────────────────────────────────────── */
function StaticFallback() {
  return (
    <div
      aria-hidden
      className="w-full h-full flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at 50% 46%, rgba(61,219,135,0.16) 0%, rgba(61,219,135,0.04) 38%, transparent 68%)',
      }}
    >
      <svg width="46%" viewBox="0 0 240 304" fill="none">
        <path
          d="M120 292 C120 248 116 206 120 166 C124 126 120 100 120 50"
          stroke="#3DDB87"
          strokeWidth="5.6"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path d="M117 200 C78 196 40 170 28 128 C70 118 108 146 117 200 Z" fill="#3DDB87" opacity="0.72" />
        <path d="M123 152 C166 146 206 116 214 70 C170 62 130 96 123 152 Z" fill="#3DDB87" opacity="0.6" />
        <path d="M118 104 C92 98 70 78 66 50 C93 46 114 70 118 104 Z" fill="#3DDB87" opacity="0.66" />
      </svg>
    </div>
  )
}

/* ── 씬 ───────────────────────────────────────────────────────── */
export default function SproutScene() {
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  useEffect(() => {
    setVerdict(probe())
  }, [])

  // 판정 전에는 폴백을 그려 레이아웃이 흔들리지 않게 한다
  if (!verdict || !verdict.render) return <StaticFallback />

  const high = verdict.quality === 'high'

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.05, 6.6], fov: 32 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-4, 1, -3]} intensity={1.2} color="#8FF0BE" />

      {/*
        drei의 <Environment preset="...">는 HDRI를 외부 CDN에서 받아온다.
        이 프로젝트 CSP는 connect-src 'self'라 차단된다.
        Lightformer로 환경을 코드 안에서 만들어 외부 요청을 0으로 유지한다.
      */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3.2} position={[2.6, 2.4, 2.2]} scale={[4, 6, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={1.4} position={[-3.2, 0.6, 1.4]} scale={[3, 5, 1]} color="#BFF3D8" />
        <Lightformer form="circle" intensity={2.0} position={[0, -2.6, 1.8]} scale={3} color="#3DDB87" />
        <Lightformer form="rect" intensity={0.9} position={[0, 2.8, -3]} scale={[6, 3, 1]} color="#FFFFFF" />
      </Environment>

      <GlassSprout quality={verdict.quality} />

      <EffectComposer enableNormalPass={false}>
          <Bloom
            mipmapBlur
            luminanceThreshold={0.32}
            luminanceSmoothing={0.22}
            intensity={high ? 1.7 : 1.15}
          radius={0.78}
        />
      </EffectComposer>
    </Canvas>
  )
}
