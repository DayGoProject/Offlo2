"use client";

/**
 * 반려 동물의 방 — 밤 창가의 아늑한 방. 앱 `components/garden/art/Room.tsx`(react-native-svg + Reanimated)를 DOM SVG + CSS로 옮긴 것이다.
 * 좌표 · 색은 같고(색은 `lib/pet/palette.ts` — 앱에서 복사), 움직임(별 반짝임 · 구름 · 램프 깜빡임)만 CSS 키프레임이다 (`globals.css`의 `.offlo-room-*`).
 * **앱의 Room.tsx를 바꾸면 이 파일도 손으로 맞춘다** — 방 그림은 동기화 스크립트가 옮기지 않는다 (`scripts/sync-pet-web.mjs` 머리말).
 *
 * 좌표는 360 × 418 단위(viewBox) — 실제 크기에 맞게 늘어난다. 동물 · 화분은 이 위에 겹쳐 놓인다 (`PetStage`).
 * 창밖 하늘은 KST 시간대(새벽 · 낮 · 저녁 · 밤)를 따라 바뀐다. 램프 빛은 방사형 그라데이션이 아니라 반투명 타원을 겹쳐서 만든다 (design.md — 사각 경계가 보인다).
 */
import { useId } from "react";

import { room as R, sky as S } from "@/lib/pet/palette";
import type { DayPart } from "@/lib/pet/scene";

export const ROOM_W = 360;
export const ROOM_H = 418;

const GLOW = Array.from({ length: 12 }, (_, i) => [176 - i * 11, 154 - i * 10] as const);
const POOL = Array.from({ length: 8 }, (_, i) => [156 - i * 13, 37 - i * 3.6] as const);

const STARS: readonly [number, number, number][] = [
  [140, 74, 1.6],
  [158, 96, 1.2],
  [196, 70, 1.8],
  [214, 104, 1.2],
  [150, 134, 1.4],
  [222, 132, 1.6],
  [176, 150, 1.1],
  [204, 88, 1],
];

const GLASS = "M123 178 L123 106 Q123 60 178 60 Q233 60 233 106 L233 178 Z";

export default function PetRoom({
  dayPart,
  animate = true,
  dim = 0,
}: {
  dayPart: DayPart;
  /** false면 정지 (별 · 구름 · 램프가 움직이지 않는다) */
  animate?: boolean;
  /** 0~1 — 동물이 굶주리면 방이 서늘하게 가라앉는다 (램프도 힘이 빠진다) */
  dim?: number;
}) {
  // useId는 ":r1:" 모양이라 url(#…)에 쓰기 전에 콜론을 걷는다
  const id = useId().replace(/:/g, "");
  const sky = S[dayPart];
  const isNight = dayPart === "night";

  return (
    <svg
      data-testid="pet-room"
      data-still={animate ? undefined : "true"}
      className="offlo-room"
      viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={`${id}wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={R.wallTop} />
          <stop offset="1" stopColor={R.wallBottom} />
        </linearGradient>
        <linearGradient id={`${id}floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={R.floorTop} />
          <stop offset="1" stopColor={R.floorBottom} />
        </linearGradient>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
        <linearGradient id={`${id}vt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`rgb(${R.vignette})`} stopOpacity={0.6} />
          <stop offset="1" stopColor={`rgb(${R.vignette})`} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}vb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`rgb(${R.vignette})`} stopOpacity={0} />
          <stop offset="1" stopColor={`rgb(${R.vignette})`} stopOpacity={0.55} />
        </linearGradient>
        <clipPath id={`${id}glass`}>
          <path d={GLASS} />
        </clipPath>
      </defs>

      {/* 벽 */}
      <rect x={0} y={0} width={ROOM_W} height={304} fill={`url(#${id}wall)`} />
      <rect x={0} y={236} width={ROOM_W} height={3} fill="rgba(255,255,255,0.045)" />
      <rect x={0} y={239} width={ROOM_W} height={65} fill="rgba(0,0,0,0.12)" />

      {/* 커튼 (창 뒤) */}
      <path d="M78 30 Q98 96 90 196 L122 196 L122 30 Z" fill={R.curtain} />
      <path d="M96 34 Q112 100 108 196" stroke={R.curtainShade} strokeWidth={5} fill="none" opacity={0.7} />
      <path d="M278 30 Q258 96 266 196 L234 196 L234 30 Z" fill={R.curtain} />
      <path d="M260 34 Q244 100 248 196" stroke={R.curtainShade} strokeWidth={5} fill="none" opacity={0.7} />

      {/* 창틀 · 하늘 */}
      <path d="M116 182 L116 106 Q116 52 178 52 Q240 52 240 106 L240 182 Z" fill={R.frame} />
      <path d={GLASS} fill={`url(#${id}sky)`} />
      <g clipPath={`url(#${id}glass)`}>{isNight ? <Moon /> : <Sun dayPart={dayPart} />}</g>

      {/* 창밖 별 · 구름 — 천천히 움직인다 (유리 모양 안에서만 보인다) */}
      <g clipPath={`url(#${id}glass)`}>
        {isNight ? (
          <>
            <g className="offlo-room-stars-a">
              {STARS.filter((_, i) => i % 2 === 0).map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill={S.star} />
              ))}
            </g>
            <g className="offlo-room-stars-b">
              {STARS.filter((_, i) => i % 2 === 1).map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill={S.star} />
              ))}
            </g>
          </>
        ) : (
          <g className="offlo-room-cloud">
            <ellipse cx={168} cy={128} rx={20} ry={7} fill={S.cloud} />
            <ellipse cx={184} cy={122} rx={14} ry={8} fill={S.cloud} />
            <ellipse cx={200} cy={129} rx={16} ry={6} fill={S.cloud} />
          </g>
        )}
      </g>

      {/* 창살 · 유리 반사 */}
      <path d="M178 60 V178 M123 118 H233" stroke={R.frame} strokeWidth={5} />
      {isNight ? null : <path d={GLASS} fill="rgba(10,16,40,0.2)" />}
      <path d="M133 168 L133 112 Q133 76 160 68" stroke="rgba(255,255,255,0.22)" strokeWidth={3} strokeLinecap="round" fill="none" />
      <rect x={108} y={178} width={140} height={9} rx={3} fill={R.sill} />

      {/* 바닥 */}
      <rect x={0} y={304} width={ROOM_W} height={ROOM_H - 304} fill={`url(#${id}floor)`} />
      <rect x={0} y={298} width={ROOM_W} height={8} fill={R.baseboard} />
      <g stroke={R.plank} strokeWidth={1.4}>
        <path d="M0 328 H360 M0 356 H360 M0 388 H360" />
        <path d="M64 306 V328 M212 306 V328 M300 306 V328 M30 328 V356 M150 328 V356 M262 328 V356 M96 356 V388 M226 356 V388 M330 356 V388 M40 388 V418 M180 388 V418 M290 388 V418" />
      </g>
      <rect x={0} y={306} width={ROOM_W} height={22} fill={R.plankLight} />

      {/* 러그 */}
      <ellipse cx={190} cy={376} rx={140} ry={33} fill={R.rug} />
      <ellipse cx={190} cy={376} rx={120} ry={26} fill="none" stroke={R.rugRing} strokeWidth={2} />
      <ellipse cx={190} cy={376} rx={98} ry={19} fill="none" stroke={R.rugRingSoft} strokeWidth={1.5} />

      {/* 화분 탁자 */}
      <rect x={30} y={300} width={5} height={30} fill={R.stool} />
      <rect x={77} y={300} width={5} height={30} fill={R.stool} />
      <ellipse cx={56} cy={298} rx={44} ry={8.5} fill={R.stoolTop} />
      <ellipse cx={56} cy={296.5} rx={44} ry={7} fill="rgba(255,255,255,0.06)" />

      {/* 램프 기둥 · 받침 */}
      <rect x={316} y={180} width={4} height={132} fill={R.lampPole} />
      <ellipse cx={318} cy={313} rx={19} ry={5.5} fill={R.lampPole} />

      {/* 램프 갓 · 빛 번짐 — 굶주리면 힘이 빠진다 */}
      <g style={{ opacity: 1 - dim * 0.45, transition: "opacity 0.9s ease" }}>
        <g className="offlo-room-lamp">
          {/* 빛 — 촘촘한 타원 여러 겹 (겹이 적으면 동심원 띠가 보인다) */}
          {GLOW.map(([rx, ry], i) => (
            <ellipse key={i} cx={318} cy={186} rx={rx} ry={ry} fill={`rgba(${R.lampGlow}, 0.016)`} />
          ))}
          {/* 바닥에 떨어지는 빛 웅덩이 */}
          {POOL.map(([rx, ry], i) => (
            <ellipse key={i} cx={246} cy={378} rx={rx} ry={ry} fill={`rgba(${R.lampGlow}, 0.02)`} />
          ))}
          {/* 갓 */}
          <path d="M294 180 L342 180 L332 140 L304 140 Z" fill={R.lampShade} />
          <path d="M294 180 L342 180 L340 172 L296 172 Z" fill={R.lampShadeShade} />
          <ellipse cx={318} cy={182} rx={11} ry={4.5} fill={R.lampBulb} />
        </g>
      </g>

      {/* 굶주림 — 서늘하게 가라앉은 방 */}
      <rect
        data-testid="pet-room-cold"
        x={0}
        y={0}
        width={ROOM_W}
        height={ROOM_H}
        fill="rgba(10, 18, 44, 0.34)"
        style={{ opacity: dim, transition: "opacity 0.9s ease" }}
      />

      {/* 위 · 아래 가장자리를 어둡게 — 카드 테두리로 자연스럽게 이어진다 */}
      <rect x={0} y={0} width={ROOM_W} height={90} fill={`url(#${id}vt)`} />
      <rect x={0} y={ROOM_H - 70} width={ROOM_W} height={70} fill={`url(#${id}vb)`} />
    </svg>
  );
}

function Moon() {
  return (
    <>
      <circle cx={198} cy={98} r={26} fill="rgba(255,241,196,0.10)" />
      <circle cx={198} cy={98} r={20} fill="rgba(255,241,196,0.16)" />
      <circle cx={198} cy={98} r={14} fill={S.moon} />
      <circle cx={193} cy={95} r={3.2} fill={S.moonShade} opacity={0.6} />
      <circle cx={203} cy={103} r={2.4} fill={S.moonShade} opacity={0.55} />
    </>
  );
}

function Sun({ dayPart }: { dayPart: DayPart }) {
  // 낮엔 높이, 새벽 · 저녁엔 창 아래쪽 (수평선 가까이)
  const y = dayPart === "day" ? 92 : 156;
  return (
    <>
      <circle cx={196} cy={y} r={32} fill="rgba(255,228,154,0.16)" />
      <circle cx={196} cy={y} r={22} fill="rgba(255,228,154,0.26)" />
      <circle cx={196} cy={y} r={14} fill={S.sun} />
    </>
  );
}
