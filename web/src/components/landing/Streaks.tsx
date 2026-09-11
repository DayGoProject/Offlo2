'use client'

/* 배경 광선 — trionn의 옅은 사선. 장식이라 aria-hidden. */
export default function Streaks({ variant = 0 }: { variant?: number }) {
  const sets = [
    [
      'M-40 690 C300 600 760 430 1480 150',
      'M-40 860 C360 760 900 500 1480 300',
      'M120 -30 C420 260 720 520 1120 930',
      'M1480 40 C1180 240 900 400 420 930',
    ],
    [
      'M-40 250 C340 340 820 520 1480 760',
      'M-40 60 C420 260 880 420 1480 610',
      'M1180 -30 C1080 240 960 480 820 930',
    ],
    [
      'M1480 260 C1020 380 520 580 -40 720',
      'M320 -30 C400 260 520 520 700 930',
    ],
  ]
  const paths = sets[variant % sets.length]

  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="#D8D8D8" strokeOpacity={0.07 - i * 0.012} strokeWidth={1} />
      ))}
      <path
        d="M300 210 L372 178"
        stroke="#3DDB87"
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="1108" cy="196" r="1.2" fill="#D8D8D8" opacity="0.22" />
      <circle cx="640" cy="806" r="1.3" fill="#3DDB87" opacity="0.4" />
    </svg>
  )
}
