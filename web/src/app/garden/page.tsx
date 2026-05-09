"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import AppSidebar from "@/components/AppSidebar";
import {
  PLANT_LEVELS, ANIMAL_TYPES, ANIMAL_STAGES,
  getPlantLevel, nextPlantLevel, getAnimalStage, getAnimalEmoji,
  type AnimalTypeId,
} from "@/lib/garden-utils";

/* ── 타입 ─────────────────────────────────────────────────── */

interface PlantData {
  totalDetoxMinutes: number;
  lastUpdated?: string;
}

interface AnimalData {
  type: AnimalTypeId | null;
  streak: number;
  lastAnalysisDate?: string;
}

/* ── 유틸 ─────────────────────────────────────────────────── */

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 999;
  const KST = 9 * 60 * 60 * 1000;
  const todayKST = new Date(Date.now() + KST).toISOString().slice(0, 10);
  return Math.floor(
    (new Date(todayKST).getTime() - new Date(dateStr).getTime()) / 86400000
  );
}

/* ── 별 위치 (hydration 오류 방지용 고정값) ────────────────── */

const STARS = [
  { top: 8, left: 12, size: 1.5, opacity: 0.7 },
  { top: 15, left: 28, size: 1, opacity: 0.5 },
  { top: 6, left: 45, size: 2, opacity: 0.8 },
  { top: 20, left: 58, size: 1, opacity: 0.4 },
  { top: 10, left: 72, size: 1.5, opacity: 0.6 },
  { top: 18, left: 85, size: 1, opacity: 0.7 },
  { top: 5, left: 92, size: 2, opacity: 0.5 },
  { top: 25, left: 15, size: 1, opacity: 0.6 },
  { top: 12, left: 38, size: 1.5, opacity: 0.4 },
  { top: 22, left: 65, size: 1, opacity: 0.8 },
  { top: 7, left: 80, size: 2, opacity: 0.6 },
  { top: 30, left: 50, size: 1, opacity: 0.3 },
];

/* ── 농장 배경 ─────────────────────────────────────────────── */

function FarmBackground({ isHungry }: { isHungry: boolean }) {
  return (
    <div className="absolute inset-0">
      {/* 하늘 */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #0a1020 0%, #0e1e35 35%, #0f2a15 65%, #1a5c2a 80%, #1e6b30 100%)"
      }} />

      {/* 별 */}
      {STARS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, opacity: s.opacity }}
          animate={{ opacity: [s.opacity, s.opacity * 0.3, s.opacity] }}
          transition={{ repeat: Infinity, duration: 2 + (i % 3), delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}

      {/* 달 */}
      <motion.div
        className="absolute rounded-full"
        style={{ top: "8%", right: "8%", width: 36, height: 36, background: "rgba(255,240,180,0.92)", boxShadow: "0 0 24px rgba(255,240,180,0.35)" }}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />

      {/* 울타리 */}
      <div className="absolute left-0 right-0" style={{ bottom: "96px" }}>
        {/* 가로 레일 */}
        <div className="absolute left-0 right-0 h-2 rounded" style={{ top: "4px", background: "rgba(139,90,43,0.75)" }} />
        <div className="absolute left-0 right-0 h-2 rounded" style={{ top: "20px", background: "rgba(139,90,43,0.75)" }} />
        {/* 세로 기둥 */}
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="absolute w-3 rounded-t"
            style={{ bottom: 0, height: "38px", left: `${i * 7.5}%`, background: "rgba(101,63,28,0.8)" }} />
        ))}
      </div>

      {/* 잔디 */}
      <div className="absolute bottom-0 left-0 right-0 h-24"
        style={{ background: "linear-gradient(180deg, #1e7a32 0%, #155a24 100%)" }} />

      {/* 배고픔 경고 오버레이 */}
      <AnimatePresence>
        {isHungry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap z-10"
            style={{ background: "rgba(251,191,36,0.92)", color: "#0a0a0f" }}
          >
            배고파해요! 오늘 AI 분석을 해주세요 💧
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Lottie or 이모지 동물 ─────────────────────────────────── */

function FarmAnimal({
  typeId, emoji, isHappy, isHungry, onClick,
}: {
  typeId: AnimalTypeId | null;
  emoji: string;
  isHappy: boolean;
  isHungry: boolean;
  onClick: () => void;
}) {
  const [lottieData, setLottieData] = useState<object | null>(null);
  const [lottieChecked, setLottieChecked] = useState(false);

  useEffect(() => {
    if (!typeId) { setLottieChecked(true); return; }
    fetch(`/lottie/${typeId}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setLottieData(data); setLottieChecked(true); })
      .catch(() => setLottieChecked(true));
  }, [typeId]);

  const animateProps = isHappy
    ? { scale: [1, 1.25, 0.9, 1.1, 1], rotate: [0, -18, 18, -6, 0] }
    : isHungry
    ? { x: [-4, 4, -4, 4, 0] }
    : { y: [0, -14, 0] };

  const transitionProps = isHappy
    ? { duration: 0.55 }
    : isHungry
    ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" as const }
    : { repeat: Infinity, duration: 2.8, ease: "easeInOut" as const };

  if (!lottieChecked) return null;

  return (
    <motion.div
      className="relative cursor-pointer select-none"
      onClick={onClick}
      animate={animateProps}
      transition={transitionProps}
      style={{ filter: isHungry ? "saturate(0.45) brightness(0.85)" : "none" }}
      whileHover={{ scale: 1.06 }}
    >
      {lottieData ? (
        <Lottie animationData={lottieData} loop style={{ width: 180, height: 180 }} />
      ) : (
        <span style={{ fontSize: "100px", lineHeight: 1 }}>{emoji}</span>
      )}

      {/* 하트 이펙트 */}
      <AnimatePresence>
        {isHappy && (
          <motion.div
            key="heart"
            className="absolute text-2xl"
            style={{ top: "-16px", left: "50%", transform: "translateX(-50%)" }}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], y: -30, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            ❤️
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── 동물 변경 경고 모달 ────────────────────────────────────── */

function ChangeAnimalModal({
  currentEmoji, currentName, currentStage, currentStreak,
  pendingAnimal, onConfirm, onCancel,
}: {
  currentEmoji: string;
  currentName: string;
  currentStage: string;
  currentStreak: number;
  pendingAnimal: typeof ANIMAL_TYPES[number];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 딤 */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onCancel}
      />

      {/* 모달 */}
      <motion.div
        className="relative w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
        style={{ background: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 0 40px rgba(239,68,68,0.2)" }}
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        {/* 경고 아이콘 */}
        <div className="flex justify-center">
          <motion.div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          >
            ⚠️
          </motion.div>
        </div>

        {/* 제목 */}
        <div className="text-center">
          <h2 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>동물을 변경하시겠어요?</h2>
          <p className="text-sm mt-1" style={{ color: "rgba(239,68,68,0.9)", fontWeight: 600 }}>
            지금까지 쌓은 연속 기록이 모두 초기화됩니다.
          </p>
        </div>

        {/* 현재 vs 변경 */}
        <div className="flex items-center gap-3">
          {/* 현재 동물 */}
          <div className="flex-1 rounded-2xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-card)" }}>
            <div className="text-4xl mb-1">{currentEmoji}</div>
            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{currentName}</p>
            <p className="text-xs mt-0.5" style={{ color: "#3DDB87" }}>{currentStage}</p>
            <p className="text-xs mt-0.5 font-bold" style={{ color: "rgba(251,191,36,0.9)" }}>
              🔥 {currentStreak}일 연속
            </p>
          </div>

          {/* 화살표 */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="text-xl" style={{ color: "rgba(239,68,68,0.7)" }}>→</div>
            <div className="text-xs font-bold" style={{ color: "rgba(239,68,68,0.7)" }}>초기화</div>
          </div>

          {/* 새 동물 */}
          <div className="flex-1 rounded-2xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-card)" }}>
            <div className="text-4xl mb-1">{pendingAnimal.emoji}</div>
            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{pendingAnimal.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>알</p>
            <p className="text-xs mt-0.5 font-bold" style={{ color: "var(--text-muted)" }}>
              🔥 0일 연속
            </p>
          </div>
        </div>

        {/* 경고 문구 */}
        <div className="rounded-xl px-4 py-3 text-xs leading-relaxed"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.85)" }}>
          연속 기록 <strong>{currentStreak}일</strong>과 현재 단계 <strong>{currentStage}</strong>가 영구적으로 사라집니다.
          이 작업은 되돌릴 수 없습니다.
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-primary)", border: "1px solid var(--border-card)" }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "rgba(239,68,68,0.15)", color: "rgb(239,68,68)", border: "1px solid rgba(239,68,68,0.4)" }}
          >
            변경하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 농장 패널 ─────────────────────────────────────────────── */

function FarmPanel({
  animal, animalEmoji, animalStage, effectiveStreak, isHungry, hasEverAnalyzed, sinceLastAnalysis,
  selectingAnimal, setSelectingAnimal, selectAnimalType,
}: {
  animal: AnimalData;
  animalEmoji: string;
  animalStage: typeof ANIMAL_STAGES[number];
  effectiveStreak: number;
  isHungry: boolean;
  hasEverAnalyzed: boolean;
  sinceLastAnalysis: number;
  selectingAnimal: boolean;
  setSelectingAnimal: (v: boolean) => void;
  selectAnimalType: (id: AnimalTypeId, reset: boolean) => void;
}) {
  const [isHappy, setIsHappy] = useState(false);
  const [pendingAnimal, setPendingAnimal] = useState<typeof ANIMAL_TYPES[number] | null>(null);

  const handlePet = useCallback(() => {
    if (isHappy || !animal.type) return;
    setIsHappy(true);
    setTimeout(() => setIsHappy(false), 700);
  }, [isHappy, animal.type]);

  function handleSelectRequest(typeId: AnimalTypeId) {
    const target = ANIMAL_TYPES.find((t) => t.id === typeId)!;
    if (animal.type) {
      // 기존 동물 있음 → 경고 모달
      setPendingAnimal(target);
    } else {
      // 최초 선택 → 바로 적용
      selectAnimalType(typeId, false);
    }
  }

  function handleConfirmChange() {
    if (!pendingAnimal) return;
    selectAnimalType(pendingAnimal.id, true);
    setPendingAnimal(null);
    setSelectingAnimal(false);
  }

  const animalTypeName = ANIMAL_TYPES.find((t) => t.id === animal.type)?.name ?? "";
  const nextStage = [...ANIMAL_STAGES].find((s) => s.minStreak > effectiveStreak);
  const currentStageMin = ANIMAL_STAGES.find((s) => s.status === animalStage.status)?.minStreak ?? 0;
  const stageProgress = nextStage
    ? Math.min(((effectiveStreak - currentStageMin) / (nextStage.minStreak - currentStageMin)) * 100, 100)
    : 100;

  return (
    <>
      {/* 동물 변경 경고 모달 */}
      <AnimatePresence>
        {pendingAnimal && (
          <ChangeAnimalModal
            currentEmoji={animalEmoji}
            currentName={animalTypeName}
            currentStage={animalStage.name}
            currentStreak={effectiveStreak}
            pendingAnimal={pendingAnimal}
            onConfirm={handleConfirmChange}
            onCancel={() => setPendingAnimal(null)}
          />
        )}
      </AnimatePresence>

    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-card)" }}>
      {/* 농장 장면 */}
      <div className="relative" style={{ height: "320px" }}>
        <FarmBackground isHungry={isHungry && !!animal.type && !selectingAnimal} />

        {/* 동물 선택 UI */}
        {(!animal.type || selectingAnimal) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10">
            <div className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(8px)" }}>
              함께할 동물을 선택하세요
            </div>
            <div className="flex gap-4">
              {ANIMAL_TYPES.map((t) => (
                <motion.button
                  key={t.id}
                  onClick={() => handleSelectRequest(t.id)}
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
                  style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
                >
                  <span className="text-5xl">{t.emoji}</span>
                  <span className="text-xs font-semibold text-white">{t.name}</span>
                </motion.button>
              ))}
            </div>
            {animal.type && (
              <button onClick={() => setSelectingAnimal(false)}
                className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                취소
              </button>
            )}
          </div>
        ) : (
          /* 동물 */
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ paddingBottom: "60px" }}>
            <div className="flex flex-col items-center gap-0">
              <FarmAnimal
                typeId={animal.type}
                emoji={animalEmoji}
                isHappy={isHappy}
                isHungry={isHungry}
                onClick={handlePet}
              />
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)", marginTop: "-4px" }}>
                탭해서 쓰다듬기
              </p>
            </div>
          </div>
        )}

        {/* 이름 + 스트릭 배지 (우상단) */}
        {animal.type && !selectingAnimal && (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
            <div className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(0,0,0,0.55)", color: "#3DDB87", backdropFilter: "blur(8px)" }}>
              {animalTypeName} · {animalStage.name}
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(8px)" }}>
              🔥 {effectiveStreak}일 연속
            </div>
          </div>
        )}

        {/* 3일+ 배고픔 → 리셋 경고 */}
        {animal.type && !selectingAnimal && hasEverAnalyzed && sinceLastAnalysis >= 3 && (
          <motion.div
            className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap z-10"
            style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            😢 연속 기록이 끊겼어요!
          </motion.div>
        )}
      </div>

      {/* 하단 정보 영역 */}
      {animal.type && !selectingAnimal && (
        <div className="px-5 py-4 space-y-3" style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border-card)" }}>
          {/* 스테이지 진행도 */}
          {nextStage && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span>{animalStage.name}</span>
                <span>다음 단계까지 {nextStage.minStreak - effectiveStreak}일</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "#3DDB87" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${stageProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* 스테이지 로드맵 */}
          <div className="flex items-center justify-between">
            {ANIMAL_STAGES.map((s) => {
              const reached = effectiveStreak >= s.minStreak;
              return (
                <div key={s.status} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold transition-all"
                    style={{ color: reached ? "#3DDB87" : "var(--text-muted)" }}>
                    {s.minStreak === 0 ? "시작" : `${s.minStreak}일`}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background: reached ? "#3DDB87" : "rgba(255,255,255,0.12)" }} />
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setSelectingAnimal(true)}
            className="w-full text-xs text-center py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            동물 변경하기
          </button>
        </div>
      )}
    </div>
    </>
  );
}

/* ── 식물 SVG ─────────────────────────────────────────────── */

function PlantSVG({ level }: { level: number }) {
  const G = "#3DDB87";
  const GD = "rgba(61,219,135,0.5)";
  const STEM = "#2DB86E";

  return (
    <svg width="140" height="180" viewBox="0 0 140 180" fill="none">
      <rect x="42" y="148" width="56" height="8" rx="3" fill="rgba(160,120,80,0.6)" />
      <path d="M38 156 L46 180 H94 L102 156 Z" fill="rgba(160,120,80,0.5)" />
      <rect x="38" y="143" width="64" height="14" rx="5" fill="rgba(120,80,50,0.6)" />
      <ellipse cx="70" cy="145" rx="28" ry="5" fill="rgba(101,67,33,0.5)" />

      {level === 1 && <ellipse cx="70" cy="135" rx="8" ry="6" fill="rgba(160,120,60,0.8)" />}

      {level === 2 && (
        <>
          <line x1="70" y1="142" x2="70" y2="110" stroke={STEM} strokeWidth="3" strokeLinecap="round" />
          <path d="M70 120 Q55 110 52 98 Q65 100 70 115" fill={G} opacity="0.9" />
          <path d="M70 125 Q85 115 88 103 Q75 105 70 120" fill={G} opacity="0.7" />
        </>
      )}

      {level === 3 && (
        <>
          <line x1="70" y1="142" x2="70" y2="90" stroke={STEM} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M70 130 Q50 118 46 102 Q63 106 70 125" fill={G} opacity="0.9" />
          <path d="M70 118 Q90 106 94 90 Q77 94 70 112" fill={G} opacity="0.8" />
          <path d="M70 104 Q54 93 50 78 Q65 82 70 98" fill={GD} opacity="0.9" />
          <circle cx="70" cy="89" r="5" fill={G} />
        </>
      )}

      {level === 4 && (
        <>
          <line x1="70" y1="142" x2="70" y2="72" stroke={STEM} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M70 132 Q46 118 42 98 Q62 102 70 126" fill={G} />
          <path d="M70 115 Q94 101 98 81 Q78 85 70 109" fill={G} opacity="0.8" />
          <path d="M70 98 Q50 85 48 66 Q65 70 70 92" fill={GD} />
          <ellipse cx="70" cy="64" rx="8" ry="12" fill="#ff9fb2" opacity="0.85" />
          <path d="M65 70 Q70 60 75 70" fill="#3DDB87" />
        </>
      )}

      {level === 5 && (
        <>
          <line x1="70" y1="142" x2="70" y2="75" stroke={STEM} strokeWidth="4" strokeLinecap="round" />
          <path d="M70 132 Q44 116 40 94 Q62 99 70 126" fill={G} />
          <path d="M70 112 Q96 96 100 74 Q78 79 70 106" fill={G} opacity="0.85" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse key={deg}
              cx={70 + 14 * Math.cos((deg * Math.PI) / 180)}
              cy={60 + 14 * Math.sin((deg * Math.PI) / 180)}
              rx="8" ry="5" fill="#ff9fb2" opacity="0.9"
              transform={`rotate(${deg} ${70 + 14 * Math.cos((deg * Math.PI) / 180)} ${60 + 14 * Math.sin((deg * Math.PI) / 180)})`}
            />
          ))}
          <circle cx="70" cy="60" r="8" fill="#FFD700" />
        </>
      )}

      {level === 6 && (
        <>
          <line x1="70" y1="142" x2="70" y2="65" stroke={STEM} strokeWidth="4" strokeLinecap="round" />
          <path d="M70 132 Q40 114 36 88 Q60 95 70 126" fill={G} />
          <path d="M70 110 Q100 92 104 66 Q80 73 70 104" fill={G} opacity="0.85" />
          <path d="M70 88 Q46 72 44 50 Q64 56 70 82" fill={GD} />
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg}
              cx={70 + 11 * Math.cos((deg * Math.PI) / 180)}
              cy={52 + 11 * Math.sin((deg * Math.PI) / 180)}
              rx="6" ry="4" fill="#ff9fb2" opacity="0.85"
              transform={`rotate(${deg} ${70 + 11 * Math.cos((deg * Math.PI) / 180)} ${52 + 11 * Math.sin((deg * Math.PI) / 180)})`}
            />
          ))}
          <circle cx="52" cy="105" r="7" fill="#ff6b6b" />
          <circle cx="88" cy="95" r="8" fill="#ff6b6b" />
          <circle cx="70" cy="115" r="6" fill="#ff8c42" />
        </>
      )}

      {level === 7 && (
        <>
          <path d="M62 142 L62 85 Q62 65 70 55 Q78 65 78 85 L78 142" fill="rgba(101,67,33,0.7)" />
          <line x1="62" y1="110" x2="35" y2="88" stroke="rgba(101,67,33,0.6)" strokeWidth="5" strokeLinecap="round" />
          <line x1="78" y1="105" x2="105" y2="83" stroke="rgba(101,67,33,0.6)" strokeWidth="5" strokeLinecap="round" />
          <line x1="62" y1="88" x2="42" y2="68" stroke="rgba(101,67,33,0.5)" strokeWidth="4" strokeLinecap="round" />
          <line x1="78" y1="82" x2="98" y2="62" stroke="rgba(101,67,33,0.5)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="70" cy="45" r="32" fill={G} opacity="0.85" />
          <circle cx="42" cy="72" r="20" fill={G} opacity="0.7" />
          <circle cx="98" cy="68" r="22" fill={G} opacity="0.75" />
          <circle cx="55" cy="38" r="16" fill={GD} opacity="0.9" />
          <circle cx="88" cy="35" r="18" fill={GD} opacity="0.85" />
        </>
      )}
    </svg>
  );
}

/* ── 카드 래퍼 ─────────────────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
      {children}
    </div>
  );
}

/* ── 메인 ──────────────────────────────────────────────────── */

export default function GardenPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [plant, setPlant] = useState<PlantData | null>(null);
  const [animal, setAnimal] = useState<AnimalData>({ type: null, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [selectingAnimal, setSelectingAnimal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [plantSnap, animalSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid, "garden", "plant")),
        getDoc(doc(db, "users", user.uid, "garden", "animal")),
      ]);
      setPlant(plantSnap.exists() ? (plantSnap.data() as PlantData) : { totalDetoxMinutes: 0 });
      if (animalSnap.exists()) {
        const d = animalSnap.data();
        setAnimal({ type: d.type ?? null, streak: d.streak ?? 0, lastAnalysisDate: d.lastAnalysisDate });
      }
      setLoading(false);
    })();
  }, [user]);

  async function selectAnimalType(typeId: AnimalTypeId, reset: boolean) {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch("/api/garden/animal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ typeId, reset }),
    });
    setAnimal((prev) => ({
      ...prev,
      type: typeId,
      streak: reset ? 0 : prev.streak,
      lastAnalysisDate: reset ? undefined : prev.lastAnalysisDate,
    }));
    setSelectingAnimal(false);
  }

  if (authLoading || !user) return null;

  const totalMin = plant?.totalDetoxMinutes ?? 0;
  const plantLevel = getPlantLevel(totalMin);
  const nextLevel = nextPlantLevel(plantLevel);
  const plantProgress = nextLevel
    ? ((totalMin - plantLevel.minMinutes) / (nextLevel.minMinutes - plantLevel.minMinutes)) * 100
    : 100;

  const sinceLastAnalysis = daysSince(animal.lastAnalysisDate);
  const hasEverAnalyzed = !!animal.lastAnalysisDate;
  const isHungry = hasEverAnalyzed && sinceLastAnalysis >= 2;
  const effectiveStreak = animal.type ? animal.streak : 0;
  const animalStage = getAnimalStage(effectiveStreak);
  const animalEmoji = getAnimalEmoji(animal.type, effectiveStreak);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="ml-56 flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* 헤더 */}
        <div className="flex items-center px-7 py-5 border-b" style={{ borderColor: "var(--border-card)" }}>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>정원</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>반려 식물과 동물을 키워보세요</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }} />
          </div>
        ) : (
          <div className="p-6 flex-1 space-y-6">

            {/* 상단 2열: 식물 + 동물 요약 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 반려 식물 */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>반려 식물</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>디톡스 시간으로 성장해요</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(61,219,135,0.12)", color: "#3DDB87" }}>
                    Lv.{plantLevel.level} {plantLevel.name}
                  </span>
                </div>

                <div className="flex justify-center my-2">
                  <PlantSVG level={plantLevel.level} />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>누적 디톡스 {fmt(totalMin)}</span>
                    {nextLevel && <span>다음 레벨까지 {fmt(nextLevel.minMinutes - totalMin)}</span>}
                    {!nextLevel && <span className="font-bold" style={{ color: "#3DDB87" }}>최고 레벨 달성!</span>}
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "#3DDB87" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(plantProgress, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  {nextLevel && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {nextLevel.emoji} {nextLevel.name}까지 {Math.round(100 - plantProgress)}% 남음
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  {PLANT_LEVELS.map((l) => (
                    <div key={l.level} className="flex flex-col items-center gap-1">
                      <span className={`text-lg transition-all ${l.level <= plantLevel.level ? "" : "opacity-20"}`}>
                        {l.emoji}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: l.level <= plantLevel.level ? "#3DDB87" : "rgba(255,255,255,0.12)" }} />
                    </div>
                  ))}
                </div>
              </Card>

              {/* 동물 요약 카드 */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>반려 동물</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>매일 AI 분석으로 성장해요</p>
                  </div>
                  {animal.type && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(61,219,135,0.12)", color: "#3DDB87" }}>
                      {animalStage.name}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {/* 동물 종류 */}
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span className="text-3xl">{animalEmoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {animal.type
                          ? `${ANIMAL_TYPES.find((t) => t.id === animal.type)?.name} · ${animalStage.name}`
                          : "동물 미선택"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {animal.type ? `🔥 ${effectiveStreak}일 연속` : "아래 농장에서 선택하세요"}
                      </p>
                    </div>
                  </div>

                  {/* 스탯 항목 */}
                  {[
                    { label: "현재 단계", value: animal.type ? animalStage.name : "—" },
                    { label: "마지막 분석", value: animal.lastAnalysisDate ?? "아직 없음" },
                    { label: "건강 상태", value: !animal.type ? "—" : (hasEverAnalyzed && sinceLastAnalysis >= 3) ? "😢 기록 초기화됨" : isHungry ? "😟 배고픔" : "😊 건강함" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* 농장 패널 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>🐾 농장</h2>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>동물을 탭해서 쓰다듬어 보세요</span>
              </div>
              <FarmPanel
                animal={animal}
                animalEmoji={animalEmoji}
                animalStage={animalStage}
                effectiveStreak={effectiveStreak}
                isHungry={isHungry}
                hasEverAnalyzed={hasEverAnalyzed}
                sinceLastAnalysis={sinceLastAnalysis}
                selectingAnimal={selectingAnimal}
                setSelectingAnimal={setSelectingAnimal}
                selectAnimalType={selectAnimalType}
              />
            </div>

            {/* 하단 통계 */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "식물 레벨", value: `Lv.${plantLevel.level} · ${plantLevel.name}` },
                { label: "누적 디톡스", value: fmt(totalMin) },
                { label: "연속 기록", value: `${effectiveStreak}일 연속` },
                { label: "동물 단계", value: animal.type ? animalStage.name : "미선택" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl px-4 py-3"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color: "#3DDB87" }}>{value}</p>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
