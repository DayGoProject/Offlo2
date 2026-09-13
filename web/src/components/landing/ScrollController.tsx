'use client'

import { useEffect } from 'react'

/* ── 섹션 스냅 스크롤 ────────────────────────────────────────────
   휠 한 번 = 한 섹션. 풀페이지 방식이다.

   Lenis를 쓰지 않는다. Lenis는 rAF로 스크롤을 구동하는데, 브라우저가
   rAF를 멈추는 상황(백그라운드 탭 등)에서 scrollTo가 진행되지 않는다.
   그런데 우리는 휠을 항상 preventDefault 하므로 — **페이지가 통째로
   스크롤 불가가 된다.** 실제로 이 조합에서 그 상태를 재현했다.

   대신 네이티브 `scrollIntoView({ behavior: 'smooth' })`를 쓴다.
   애니메이션을 브라우저가 돌리므로 우리 JS 루프와 무관하고,
   window.scrollTo를 가로채지 않으니 앵커 링크도 그대로 동작한다.

   모바일은 JS로 가로채지 않고 CSS scroll-snap에 맡긴다 (globals.css).
   ──────────────────────────────────────────────────────────── */

const FALLBACK_UNLOCK_MS = 900

export default function ScrollController() {
  useEffect(() => {
    // 접근성: 모션을 줄이는 사용자에게는 스크롤을 가로채지 않는다
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // 터치 기기는 CSS scroll-snap이 처리한다
    if (window.matchMedia('(pointer: coarse)').matches) return

    let locked = false
    let unlockTimer: ReturnType<typeof setTimeout> | undefined

    const targets = () => Array.from(document.querySelectorAll<HTMLElement>('[data-snap]'))

    function currentIndex() {
      const list = targets()
      const y = window.scrollY
      let best = 0
      let bestDist = Infinity
      list.forEach((el, i) => {
        const d = Math.abs(el.offsetTop - y)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      return best
    }

    function unlock() {
      locked = false
      clearTimeout(unlockTimer)
    }

    function go(dir: 1 | -1) {
      const list = targets()
      if (!list.length) return
      const next = Math.min(Math.max(currentIndex() + dir, 0), list.length - 1)
      const el = list[next]
      if (!el) return

      locked = true
      clearTimeout(unlockTimer)
      // scrollend를 지원하지 않는 브라우저를 위한 보험. 이게 없으면
      // 한 번 실패했을 때 영영 잠긴 채로 남는다.
      unlockTimer = setTimeout(unlock, FALLBACK_UNLOCK_MS)

      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (!targets().length) return // 스냅 대상이 없으면 네이티브 스크롤에 맡긴다
      e.preventDefault()
      if (locked || Math.abs(e.deltaY) < 4) return
      go(e.deltaY > 0 ? 1 : -1)
    }

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        if (!locked) go(1)
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        if (!locked) go(-1)
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault()
        const list = targets()
        const el = e.key === 'Home' ? list[0] : list[list.length - 1]
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('scrollend', unlock)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scrollend', unlock)
      clearTimeout(unlockTimer)
    }
  }, [])

  return null
}
