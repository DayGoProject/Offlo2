'use client'

import ScrollController from '@/components/landing/ScrollController'
import ParallaxField from '@/components/landing/ParallaxField'
import TopBar from '@/components/landing/TopBar'
import Hero from '@/components/landing/Hero'
import Definition from '@/components/landing/Definition'
import Problem from '@/components/landing/Problem'
import Analysis from '@/components/landing/Analysis'
import Garden from '@/components/landing/Garden'
import Extension from '@/components/landing/Extension'
import CTA from '@/components/landing/CTA'
import { useAuth } from '@/hooks/useAuth'

export default function LandingPage() {
  const { user } = useAuth()
  const ctaHref = user ? '/dashboard' : '/signup'

  return (
    <>
      <ScrollController />

      <main style={{ background: '#040508' }} className="relative w-full overflow-x-hidden">
        {/* 전 페이지 공통 오브젝트 레이어 — 섹션보다 뒤(z-0) */}
        <ParallaxField />

        <div className="relative" style={{ zIndex: 1 }}>
          <div className="absolute inset-x-0 top-0 z-30">
            <TopBar ctaHref={ctaHref} />
          </div>

          <Hero ctaHref={ctaHref} />
          <Definition />
          <Problem />
          <div id="analysis">
            <Analysis />
          </div>
          <Garden />

          <Extension />
          <CTA ctaHref={ctaHref} />
        </div>
      </main>
    </>
  )
}
