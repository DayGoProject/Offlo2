"use client";

/**
 * 정원 반려 동물 무대 — 방 위에 3D 클레이 동물 · 식물 화분 · 말풍선이 함께 산다. 앱 `components/garden/PetStage.tsx`와 같은 장면이다
 * (동물 모델 · 표정 · 성장 외형 · 배고픔 몸짓은 앱 레포가 원본 — `scripts/sync-pet-web.mjs`). 모든 좌표는 방의 360 × 418 단위이고 실제 폭에 맞춰 한 배율(k)로 늘린다.
 *
 * `.claude/rules/3d.md` 규칙
 *  · R3F는 `components/three/pet/`에만 있고 여기서는 `next/dynamic({ ssr: false })`로만 부른다 — 3D 번들은 동물 탭을 열고 WebGL이 될 때만 받는다.
 *  · **폴백은 필수다** — 동작 줄이기 · WebGL 불가 · 모델 로드 실패면 3D를 그리지 않고 기존 SVG 동물(`renderFallback`)을 보여준다.
 *  · 뷰포트 밖이면 프레임 루프를 멈춘다 (`active`) · 픽셀 비율은 최대 1.5 (저사양은 1).
 *
 * 쓰다듬기: **톡**(탭 = 1번) · **쓱쓱**(좌우로 문지르기 = 마치면 1번). 위아래로 끌면 페이지 스크롤이 가져간다 (`touch-action: pan-y`).
 * 친밀도로 인정되는지는 부모가 정한다 (`onPet` — 하루 5번 상한 · 서버 기록). 이 컴포넌트는 반응(3D · 말풍선)만 낸다.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import PetRoom, { ROOM_H, ROOM_W } from "@/components/garden/PetRoom";
import PlantImage from "@/components/garden/PlantImage";
import PetErrorBoundary from "@/components/three/pet/PetErrorBoundary";
import { ROOM_LAYOUT } from "@/components/three/pet/petCanvasTypes";
import { getAnimalStage, type AnimalStatus, type AnimalTypeId } from "@/lib/garden-utils";
import { levelUpLine, reactionLine, type TapResult } from "@/lib/pet/affection";
import { CONDITION_LABEL, type PetCondition } from "@/lib/pet/condition";
import { bubble as B } from "@/lib/pet/palette";
import { dayPartOf, isAnxious, pickLine, speechLines } from "@/lib/pet/scene";

const PetCanvas = dynamic(() => import("@/components/three/pet/PetCanvas"), { ssr: false });

/** 3D 캔버스 — 방 폭을 다 덮고 위쪽은 창 아래까지만 (`ROOM_LAYOUT`이 이 영역 기준으로 조정돼 있다) */
const CANVAS_TOP = 96;
/** 식물 이미지(정사각) — 탁자 윗면(y≈296)에 밑동이 닿도록 앉힌다 */
const PLANT_SIZE = 124;
const PLANT_TOP = 190;
const PET_CENTER_X = 196;
/** 쓰다듬었을 때 동물이 하는 말이 떠 있는 시간 */
const REACTION_MS = 2400;
/** 문지르며 이만큼(px) 움직일 때마다 한 구간 · 이보다 덜 움직이고 뗐으면 탭 */
const STEP_PX = 34;
const TAP_SLOP = 10;
const MIN_TICK_GAP_MS = 70;

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** 코어 ≤4 · 메모리 ≤4GB — 픽셀 비율을 1로 묶는다 (.claude/rules/3d.md "저사양") */
function isLowPower(): boolean {
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 4 || mem <= 4;
}

/** 몇 초마다 혼잣말을 하나씩 보였다 숨긴다 — 앱 `useSpeech`와 같은 박자 */
function useAmbientSpeech(lines: readonly string[], enabled: boolean): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || lines.length === 0) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let turn = 0;
    const cycle = (delay: number) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setText(pickLine(lines, turn));
          turn += 1;
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setText(null);
              cycle(6200 + (turn % 3) * 1700);
            }, 3400),
          );
        }, delay),
      );
    };
    cycle(1500);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setText(null);
    };
  }, [lines, enabled]);
  return enabled && lines.length > 0 ? text : null;
}

interface Gesture {
  id: number;
  startY: number;
  lastX: number;
  travel: number;
  dy: number;
  ticks: number;
  lastTickAt: number;
}
const idle = (): Gesture => ({ id: -1, startY: 0, lastX: 0, travel: 0, dy: 0, ticks: 0, lastTickAt: 0 });

export default function PetStage({
  type,
  streak,
  condition,
  totalMinutes,
  now,
  onPet,
  renderFallback,
}: {
  type: AnimalTypeId;
  streak: number;
  condition: PetCondition;
  /** 식물 경험치 — 방 한쪽 화분에 자란 단계로 놓인다 */
  totalMinutes: number;
  /** 기준 시각(ms) — 창밖 하늘 · 저녁 초조함 */
  now: number;
  /** 쓰다듬기 한 번이 친밀도로 인정되는지 알려 준다 (한 번에 한 번만 부른다) — 없으면 반응만 */
  onPet?: () => TapResult;
  /** 3D를 쓸 수 없을 때(동작 줄이기 · WebGL 불가 · 모델 로드 실패) 대신 그릴 기존 SVG 동물 */
  renderFallback: () => ReactNode;
}) {
  const reduced = useReducedMotion();
  const [gl, setGl] = useState<"probing" | "ok" | "none">("probing");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [visible, setVisible] = useState(true);
  const [width, setWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGl(webglAvailable() ? "ok" : "none");
    setLowPower(isLowPower());
  }, []);

  // 방 폭 → 배율. 뷰포트 밖이면 프레임 루프를 멈춘다
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const k = width / ROOM_W;
  const stage = getAnimalStage(streak).status;
  const isEgg = condition === "egg";
  const anxious = isAnxious(condition, now);
  const useFallback = !!reduced || gl === "none" || failed;
  const speech = useAmbientSpeech(speechLines(condition, type), width > 0 && !useFallback);

  // 3D 장면에서의 성장 단계 — 알은 "밥을 한 번도 못 먹은" 상태이고, 연속 기록이 0으로 끊긴 동물(굶주림)은 아기로 보인다
  const stage3d: AnimalStatus = isEgg ? "egg" : stage === "egg" ? "baby" : stage;

  // 밥을 먹으면(출출 · 굶주림 → 배부름) 먹는 연출을 한 번 — 렌더 중에 이전 상태와 비교한다
  const [prevCondition, setPrevCondition] = useState(condition);
  const [eatSignal, setEatSignal] = useState(0);
  const [eatRecovery, setEatRecovery] = useState(false);
  if (condition !== prevCondition) {
    setPrevCondition(condition);
    if (condition === "fed" && (prevCondition === "peckish" || prevCondition === "starving")) {
      setEatRecovery(prevCondition === "starving");
      setEatSignal((n) => n + 1);
    }
  }

  // ── 쓰다듬기 ─────────────────────────────────────────────
  const [petSignal, setPetSignal] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turn = useRef(0);
  const g = useRef<Gesture>(idle());
  useEffect(
    () => () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    },
    [],
  );
  const say = useCallback((text: string | null) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction(text);
    reactionTimer.current = text ? setTimeout(() => setReaction(null), REACTION_MS) : null;
  }, []);

  /** 한 번 닿았다(탭) 또는 문지르기를 마쳤다 — 친밀도는 여기서 한 번만 센다 */
  const touched = (stroke: boolean) => {
    const r = onPet?.();
    if (!stroke) setPetSignal((n) => n + 1);
    if (r?.levelUp) say(levelUpLine(r.view));
    else if (r && (r.reachedCap || !r.counted)) say(reactionLine(condition, type, "capped", turn.current++));
    else if (!stroke) say(reactionLine(condition, type, "pet", turn.current++));
  };
  /** 문지르는 중 구간 하나 — 반응 이어가기 (첫 구간에서 한마디) */
  const stroking = (ticks: number) => {
    setPetSignal((n) => n + 1);
    if (ticks === 1) say(reactionLine(condition, type, "pet", turn.current++));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (g.current.id !== -1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    g.current = { ...idle(), id: e.pointerId, startY: e.clientY, lastX: e.clientX };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = g.current;
    if (s.id !== e.pointerId) return;
    s.travel += Math.abs(e.clientX - s.lastX);
    s.lastX = e.clientX;
    s.dy = Math.max(s.dy, Math.abs(e.clientY - s.startY));
    const t = performance.now();
    if (Math.floor(s.travel / STEP_PX) > s.ticks && t - s.lastTickAt >= MIN_TICK_GAP_MS) {
      s.ticks += 1;
      s.lastTickAt = t;
      stroking(s.ticks);
    }
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = g.current;
    if (s.id !== e.pointerId) return;
    g.current = idle();
    if (s.ticks > 0) touched(true);
    else if (s.travel < TAP_SLOP && s.dy < TAP_SLOP) touched(false);
  };
  const onPointerCancel = () => {
    // 위아래로 끌어 스크롤이 가져갔다 — 쓰다듬기로 세지 않는다
    g.current = idle();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      touched(false);
    }
  };

  if (useFallback) return <>{renderFallback()}</>;

  const touchable = width > 0 && gl === "ok" && ready;

  return (
    <div
      ref={boxRef}
      data-testid="pet-stage"
      role="group"
      aria-label={`${CONDITION_LABEL[condition]} 상태의 반려 동물이 사는 방`}
      className="relative w-full overflow-hidden rounded-card select-none"
      style={{ aspectRatio: `${ROOM_W} / ${ROOM_H}`, border: "1px solid var(--border-card)", background: "var(--bg-card)" }}
    >
      {width > 0 ? (
        <>
          <PetRoom dayPart={dayPartOf(now)} dim={condition === "starving" ? 1 : 0} />

          {/* 식물 — 탁자 위에서 자란 단계 그대로 */}
          <div className="absolute pointer-events-none" style={{ left: -6 * k, top: PLANT_TOP * k }}>
            <PlantImage totalMinutes={totalMinutes} size={PLANT_SIZE * k} />
          </div>

          {/* 3D 동물 · 그릇 — 투명 캔버스. 탭은 받지 않는다 (아래 터치면이 대신 받는다) */}
          {gl === "ok" ? (
            <div
              data-testid="pet-3d"
              className="absolute pointer-events-none"
              style={{
                left: 0,
                top: CANVAS_TOP * k,
                width,
                height: (ROOM_H - CANVAS_TOP) * k,
                opacity: ready ? 1 : 0,
                transition: "opacity 0.32s ease",
              }}
            >
              <PetErrorBoundary onError={() => setFailed(true)}>
                <PetCanvas
                  type={type}
                  stage={stage3d}
                  condition={condition}
                  anxious={anxious}
                  active={visible}
                  layout={ROOM_LAYOUT}
                  eatSignal={eatSignal}
                  eatRecovery={eatRecovery}
                  petSignal={petSignal}
                  lowPower={lowPower}
                  onReady={() => setReady(true)}
                />
              </PetErrorBoundary>
            </div>
          ) : null}
          {ready ? <span data-testid="pet-3d-ready" hidden /> : null}
          {!ready && gl === "ok" ? (
            <p
              className="absolute left-0 right-0 text-center text-xs pointer-events-none"
              style={{ top: 230 * k, color: "var(--text-muted)" }}
            >
              동물을 불러오는 중이에요…
            </p>
          ) : null}

          {/* 쓰다듬기 — 동물이 그려진 뒤에만. 위아래로 끄는 스크롤은 그대로 통과한다 */}
          {touchable ? (
            <div
              data-testid="pet-touch"
              role="button"
              tabIndex={0}
              aria-label={isEgg ? "알 쓰다듬기" : "동물 쓰다듬기"}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onKeyDown={onKeyDown}
              className="absolute cursor-pointer outline-none focus-visible:ring-2"
              style={{ left: 56 * k, top: 150 * k, width: 270 * k, height: 262 * k, touchAction: "pan-y" }}
            />
          ) : null}

          {/* 말풍선 */}
          <div
            className="absolute pointer-events-none flex justify-center"
            style={{ left: PET_CENTER_X * k, top: 100 * k, transform: "translateX(-50%)", width: width * 0.72 }}
          >
            <AnimatePresence mode="popLayout">
              {(reaction ?? speech) ? (
                <motion.div
                  key={reaction ?? speech}
                  data-testid="pet-bubble"
                  className="relative text-[13px] leading-[18px] font-semibold text-center px-3.5 py-[9px]"
                  style={{ background: B.fill, color: B.text, border: `1px solid ${B.border}`, borderRadius: 16, maxWidth: "100%" }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {reaction ?? speech}
                  <span
                    className="absolute left-1/2 w-3 h-3"
                    style={{
                      bottom: -6,
                      marginLeft: -6,
                      background: B.fill,
                      borderRight: `1px solid ${B.border}`,
                      borderBottom: `1px solid ${B.border}`,
                      transform: "rotate(45deg)",
                    }}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* 상태 칩 */}
          <div
            data-testid="pet-condition-chip"
            className="absolute left-3 top-3 flex items-center gap-2 px-3 h-7 rounded-full text-xs font-semibold"
            style={{ border: "1px solid var(--border-card)", background: "rgba(4, 5, 8, 0.6)", color: "var(--text-primary)" }}
          >
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{ background: condition === "fed" ? "var(--color-bloom)" : "var(--text-faint)" }}
            />
            {CONDITION_LABEL[condition]}
          </div>
        </>
      ) : null}
    </div>
  );
}
