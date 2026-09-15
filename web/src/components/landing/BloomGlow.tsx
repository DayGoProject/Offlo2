/* 브랜드 그린 방사형 글로우 — 섹션마다 한 곳에만 둔다.
   랜딩 이미지는 전부 투명 배경이라 글로우를 오브젝트 *뒤*(DOM상 앞)에 깔면 된다. */
export default function BloomGlow({
  className = '',
  strength = 0.14,
  shape = 'circle',
}: {
  className?: string
  /** 중심 알파 */
  strength?: number
  shape?: 'circle' | 'ellipse'
}) {
  const mid = +(strength * 0.36).toFixed(3)
  return (
    <div
      aria-hidden
      className={`absolute pointer-events-none ${className}`}
      style={{
        background: `radial-gradient(${shape} at 50% 50%, rgba(61,219,135,${strength}) 0%, rgba(61,219,135,${mid}) 35%, rgba(61,219,135,0) 64%)`,
      }}
    />
  )
}
