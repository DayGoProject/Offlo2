/**
 * 디톡스 점수 추이 — 축도 툴팁도 없는 한 줄짜리 스플라인.
 *
 * Paper 디자인(앱 04 — 분석 기록)의 차트를 그대로 옮겼다. recharts를 쓰지 않는다:
 * 이 모양에 필요한 건 path 하나와 가로줄 3개뿐인데 라이브러리는 ~107kB다.
 * 13단계에서 recharts를 지연 로딩으로 격리한 것도 같은 이유였고, 이제는
 * 아예 필요가 없어졌다.
 *
 * 클라이언트 훅을 쓰지 않으므로 서버 컴포넌트로도 렌더된다.
 */

const W = 1100;
const H = 190;
const PAD_Y = 24; // 위아래 여백 — 곡선이 잘리지 않게

/** Catmull-Rom을 3차 베지어로 변환해 부드러운 곡선을 만든다 */
function spline(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x} ${pts[0].y}`;

  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export interface TrendPoint {
  /** x축에 찍을 라벨 (예: "9/11") */
  label: string;
  /** 0~100 */
  score: number;
}

export default function TrendLine({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) return null;

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: PAD_Y + (1 - Math.max(0, Math.min(100, d.score)) / 100) * (H - PAD_Y * 2),
  }));
  const lastY = pts[pts.length - 1].y;

  // 라벨은 최대 6개만 — 기록이 많아지면 겹친다
  const step = Math.max(1, Math.ceil(data.length / 6));
  const labels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* preserveAspectRatio="none"이라 가로만 늘어난다. 선은 non-scaling-stroke로
          두께를 지키지만 원은 타원이 되므로, 마지막 점은 SVG 밖에 DOM으로 얹는다.
          마지막 점의 x는 항상 오른쪽 끝이라 right:0로 위치가 정해진다. */}
      <div className="relative w-full shrink-0" style={{ height: H }}>
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          className="block"
          role="img"
          aria-label={`디톡스 점수 추이 — 최근 ${data.length}건, 마지막 ${data[data.length - 1].score}점`}
        >
          {/* 가로 기준선 3개. 눈금 숫자는 쓰지 않는다 — 값은 표에서 읽는다 */}
          <path
            d={`M0 38h${W}M0 86h${W}M0 134h${W}`}
            fill="none"
            stroke="rgba(216,216,216,0.06)"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={spline(pts)}
            fill="none"
            stroke="var(--color-bloom)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className="absolute w-[9px] h-[9px] rounded-full"
          style={{ background: "var(--color-bloom)", right: 0, top: lastY, transform: "translate(50%, -50%)" }}
        />
      </div>

      <div className="flex justify-between w-full">
        {labels.map((d, i) => (
          <span
            key={`${d.label}-${i}`}
            className="num text-[11px] leading-[14px]"
            style={{ color: i === labels.length - 1 ? "var(--text-primary)" : "var(--text-muted)", letterSpacing: 0 }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
