"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import Segmented from "@/components/app/Segmented";
import Modal from "@/components/app/Modal";
import PlantImage from "@/components/garden/PlantImage";
import { fmt } from "@/lib/format";
import {
  PLANT_LEVELS,
  ANIMAL_TYPES,
  ANIMAL_STAGES,
  getPlantLevel,
  nextPlantLevel,
  getAnimalStage,
  getAnimalEmoji,
  type AnimalTypeId,
} from "@/lib/garden-utils";

// 동물 SVG는 660줄짜리 클라이언트 전용 컴포넌트다. 식물 탭만 보는 사용자가
// 이 코드를 받지 않도록 지연 로딩한다.
const Animal3D = dynamic(() => import("@/components/garden/Animal3D"), { ssr: false });

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

type Tab = "plant" | "animal";

/* ── 유틸 ─────────────────────────────────────────────────── */

function daysSince(dateStr?: string): number {
  if (!dateStr) return 999;
  const KST = 9 * 60 * 60 * 1000;
  const todayKST = new Date(Date.now() + KST).toISOString().slice(0, 10);
  return Math.floor((new Date(todayKST).getTime() - new Date(dateStr).getTime()) / 86400000);
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

/* ── 공통 조각 ─────────────────────────────────────────────── */

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-4 px-6 py-[22px] rounded-card ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {children}
    </div>
  );
}

function PanelHead({ title, aside }: { title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {aside}
    </div>
  );
}

function Bar({ ratio, dim = false }: { ratio: number; dim?: boolean }) {
  return (
    <div className="flex-1 h-[5px] rounded-full min-w-0" style={{ background: "var(--score-track)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: dim ? "rgba(61,219,135,0.7)" : "var(--color-bloom)" }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

/** 진행도 요약 — 큰 숫자 + 바 + 남은 만큼 한 줄 */
function ProgressFoot({ headline, ratio, note }: { headline: string; ratio: number; note: string }) {
  return (
    <div className="flex flex-col gap-2.5 w-full pt-3.5" style={{ borderTop: "1px solid var(--border-card)" }}>
      <span className="num text-[22px] leading-7" style={{ color: "var(--text-muted)", letterSpacing: "-0.03em" }}>
        {headline}
      </span>
      <div className="flex w-full">
        <Bar ratio={ratio} />
      </div>
      <p className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
        {note}
      </p>
    </div>
  );
}

/* ── 농장 배경 (동물 선택 화면) ────────────────────────────── */

function FarmBackground({ isHungry }: { isHungry: boolean }) {
  return (
    <div className="absolute inset-0">
      {/* 하늘 */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #0a1020 0%, #0e1e35 35%, #0f2a15 65%, #1a5c2a 80%, #1e6b30 100%)" }}
      />

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
        style={{
          top: "8%",
          right: "8%",
          width: 36,
          height: 36,
          background: "rgba(255,240,180,0.92)",
          boxShadow: "0 0 24px rgba(255,240,180,0.35)",
        }}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />

      {/* 울타리 */}
      <div className="absolute left-0 right-0" style={{ bottom: "96px" }}>
        <div className="absolute left-0 right-0 h-2 rounded" style={{ top: "4px", background: "rgba(139,90,43,0.75)" }} />
        <div className="absolute left-0 right-0 h-2 rounded" style={{ top: "20px", background: "rgba(139,90,43,0.75)" }} />
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 rounded-t"
            style={{ bottom: 0, height: "38px", left: `${i * 7.5}%`, background: "rgba(101,63,28,0.8)" }}
          />
        ))}
      </div>

      {/* 잔디 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{ background: "linear-gradient(180deg, #1e7a32 0%, #155a24 100%)" }}
      />

      <AnimatePresence>
        {isHungry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap z-10"
            style={{ background: "rgba(251,191,36,0.92)", color: "#040508" }}
          >
            배고파해요! 오늘 AI 분석을 해주세요 💧
          </motion.div>
        )}
      </AnimatePresence>
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
  const [tab, setTab] = useState<Tab>("plant");
  const [selecting, setSelecting] = useState(false);
  const [pending, setPending] = useState<(typeof ANIMAL_TYPES)[number] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [plantSnap, animalSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid, "garden", "plant")),
          getDoc(doc(db, "users", user.uid, "garden", "animal")),
        ]);
        setPlant(plantSnap.exists() ? (plantSnap.data() as PlantData) : { totalDetoxMinutes: 0 });
        if (animalSnap.exists()) {
          const d = animalSnap.data();
          setAnimal({ type: d.type ?? null, streak: d.streak ?? 0, lastAnalysisDate: d.lastAnalysisDate });
        }
      } catch (e) {
        // 실패해도 스켈레톤이 영원히 남지 않도록 finally에서 반드시 푼다
        console.error(e);
      } finally {
        setLoading(false);
      }
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
    setSelecting(false);
    setPending(null);
  }

  if (authLoading || !user) return null;

  /* ── 파생값 ── */
  const totalMin = plant?.totalDetoxMinutes ?? 0;
  const level = getPlantLevel(totalMin);
  const next = nextPlantLevel(level);
  const plantRatio = next ? (totalMin - level.minMinutes) / (next.minMinutes - level.minMinutes) : 1;
  const plantRemain = next ? next.minMinutes - totalMin : 0;

  const since = daysSince(animal.lastAnalysisDate);
  const hasEverAnalyzed = !!animal.lastAnalysisDate;
  const isHungry = hasEverAnalyzed && since >= 2;
  const streak = animal.type ? animal.streak : 0;
  const stage = getAnimalStage(streak);
  const animalEmoji = getAnimalEmoji(animal.type, streak);
  const typeName = ANIMAL_TYPES.find((t) => t.id === animal.type)?.name ?? "";

  const nextStage = ANIMAL_STAGES.find((s) => s.minStreak > streak) ?? null;
  const stageRatio = nextStage ? (streak - stage.minStreak) / (nextStage.minStreak - stage.minStreak) : 1;

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          tab === "plant"
            ? `LV.${level.level} · ${level.name}`
            : animal.type
              ? `${typeName} · ${stage.name}`
              : "동물 미선택"
        }
        title={
          tab === "plant"
            ? "오늘도 잘 자라고 있어요"
            : animal.type
              ? `${streak}일째 함께하고 있어요`
              : "함께할 동물을 골라 주세요"
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "plant", label: "반려 식물" },
          { value: "animal", label: "반려 동물" },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-3.5 w-full">
        {/* ══ 무대 ══ */}
        <section
          className="relative flex flex-col items-center justify-center flex-1 min-w-0 min-h-[380px] lg:min-h-[560px] rounded-card overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
        >
          {tab === "plant" ? (
            <>
              {/* 식물 뒤의 녹색 번짐. 이미지 글로우와 겹쳐 공간감을 만든다 */}
              <div
                className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
                style={{
                  width: 620,
                  height: 620,
                  marginLeft: -310,
                  marginTop: -310,
                  maxWidth: "140%",
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(61,219,135,0.13) 0%, rgba(61,219,135,0.04) 42%, transparent 70%)",
                }}
              />
              {loading ? (
                <div
                  className="w-9 h-9 rounded-full border-2 animate-spin"
                  style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }}
                />
              ) : (
                <PlantImage totalMinutes={totalMin} size={400} priority className="relative" />
              )}

              <div className="absolute left-6 sm:left-[26px] bottom-6 flex flex-col gap-1.5 max-w-[70%]">
                <span
                  className="text-[11px] leading-[14px] font-semibold"
                  style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
                >
                  LV.{level.level} · {level.name}
                </span>
                <span className="text-[20px] sm:text-[22px] leading-7 tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                  누적 {fmt(totalMin)}
                </span>
              </div>
            </>
          ) : !animal.type || selecting ? (
            /* 동물 선택 화면 — 15단계에서 Blender 에셋으로 교체 예정 */
            <div className="relative w-full h-full min-h-[380px] lg:min-h-[560px]">
              <FarmBackground isHungry={false} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10 px-4">
                <div
                  className="px-5 py-2 rounded-full text-sm font-semibold"
                  style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(8px)" }}
                >
                  함께할 동물을 선택하세요
                </div>
                <div className="flex gap-2 sm:gap-4">
                  {ANIMAL_TYPES.map((t) => (
                    <motion.button
                      key={t.id}
                      onClick={() => (animal.type ? setPending(t) : selectAnimalType(t.id, false))}
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.96 }}
                      className="flex flex-col items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl cursor-pointer"
                      style={{
                        background: "rgba(0,0,0,0.55)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <span className="text-5xl">{t.emoji}</span>
                      <span className="text-xs font-semibold text-white">{t.name}</span>
                    </motion.button>
                  ))}
                </div>
                {animal.type && (
                  <button onClick={() => setSelecting(false)} className="text-xs cursor-pointer" style={{ color: "rgba(255,255,255,0.5)" }}>
                    취소
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="w-full">
                <Animal3D typeId={animal.type} stage={stage} isHungry={isHungry} effectiveStreak={streak} />
              </div>
              <div className="absolute right-6 sm:right-[26px] bottom-6 flex items-center gap-2">
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: "var(--color-bloom)" }} />
                <span className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
                  탭하면 쓰다듬을 수 있어요
                </span>
              </div>
            </>
          )}
        </section>

        {/* ══ 사이드 패널 ══ */}
        <aside className="flex flex-col gap-3.5 w-full lg:w-[330px] shrink-0">
          {tab === "animal" && (
            <Panel>
              <PanelHead
                title={animal.type ? `${typeName} · ${stage.name}` : "반려 동물"}
                aside={
                  <span className="num text-xs font-medium shrink-0" style={{ color: "var(--color-bloom)", letterSpacing: 0 }}>
                    {animal.type ? `${streak}일 연속` : "미선택"}
                  </span>
                }
              />
              <div className="flex flex-col gap-3 w-full">
                {[
                  { label: "친밀도", ratio: Math.min(1, streak / 21), dim: false },
                  { label: "기분", ratio: isHungry ? 0.35 : animal.type ? 0.95 : 0, dim: true },
                  { label: "건강", ratio: since >= 3 ? 0.2 : animal.type ? Math.max(0.4, Math.min(1, streak / 30)) : 0, dim: false },
                ].map(({ label, ratio, dim }) => (
                  <div key={label} className="flex items-center gap-3.5 w-full">
                    <span className="text-xs font-medium shrink-0 w-11" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </span>
                    <Bar ratio={ratio} dim={dim} />
                  </div>
                ))}
              </div>
              {animal.type && (
                <button
                  onClick={() => setSelecting(true)}
                  className="w-full h-[34px] rounded-full text-xs font-medium transition-opacity hover:opacity-75 cursor-pointer"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
                >
                  동물 변경하기
                </button>
              )}
            </Panel>
          )}

          <Panel className="flex-1">
            <PanelHead
              title="성장 단계"
              aside={
                <span className="num text-xs font-medium shrink-0" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
                  {tab === "plant"
                    ? `${level.level} / ${PLANT_LEVELS.length}`
                    : `${ANIMAL_STAGES.findIndex((s) => s.status === stage.status) + 1} / ${ANIMAL_STAGES.length}`}
                </span>
              }
            />

            {tab === "plant" ? (
              <>
                <div className="grid grid-cols-4 gap-2 w-full">
                  {PLANT_LEVELS.map((l) => {
                    const current = l.level === level.level;
                    const reached = l.level < level.level;
                    return (
                      <div
                        key={l.level}
                        className="flex flex-col items-center gap-1.5 px-1 py-2 rounded-[9px]"
                        style={{
                          background: current ? "var(--accent-soft)" : undefined,
                          border: current ? "1px solid rgba(61,219,135,0.2)" : "1px solid transparent",
                        }}
                      >
                        <Image
                          src={l.thumb}
                          alt={l.name}
                          width={46}
                          height={46}
                          unoptimized
                          className="shrink-0"
                          style={{ opacity: current ? 1 : reached ? 0.45 : 0.22 }}
                        />
                        <span
                          className="text-[10px] leading-3 text-center"
                          style={{
                            color: current ? "var(--color-bloom)" : reached ? "var(--text-muted)" : "var(--text-ghost)",
                            fontWeight: current ? 600 : 400,
                          }}
                        >
                          {l.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <ProgressFoot
                  headline={next ? `${totalMin.toLocaleString()} / ${next.minMinutes.toLocaleString()}분` : `${totalMin.toLocaleString()}분`}
                  ratio={plantRatio}
                  note={next ? `${next.name}까지 ${plantRemain.toLocaleString()}분 남았어요` : "마지막 단계까지 키웠어요"}
                />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2 w-full">
                  {ANIMAL_STAGES.map((s) => {
                    const current = s.status === stage.status && !!animal.type;
                    const reached = animal.type ? streak >= s.minStreak : false;
                    return (
                      <div
                        key={s.status}
                        className="flex items-center gap-3 px-3 h-9 rounded-[9px]"
                        style={{
                          background: current ? "var(--accent-soft)" : undefined,
                          border: current ? "1px solid rgba(61,219,135,0.2)" : "1px solid transparent",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: reached ? "var(--color-bloom)" : "var(--text-ghost)" }}
                        />
                        <span
                          className="text-[13px] leading-4 flex-1"
                          style={{
                            color: current ? "var(--color-bloom)" : reached ? "var(--text-primary)" : "var(--text-faint)",
                            fontWeight: current ? 600 : 400,
                          }}
                        >
                          {s.name}
                        </span>
                        <span className="num text-xs shrink-0" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
                          {s.minStreak === 0 ? "시작" : `${s.minStreak}일`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <ProgressFoot
                  headline={nextStage ? `${streak} / ${nextStage.minStreak}일` : `${streak}일`}
                  ratio={stageRatio}
                  note={
                    !animal.type
                      ? "동물을 선택하면 시작돼요"
                      : nextStage
                        ? `${nextStage.name}까지 ${nextStage.minStreak - streak}일 남았어요`
                        : "마지막 단계에 도달했어요"
                  }
                />
              </>
            )}
          </Panel>
        </aside>
      </div>

      {/* ── 동물 변경 경고 ── */}
      <Modal open={!!pending} onClose={() => setPending(null)} title="동물을 변경하시겠어요?" width="max-w-sm">
        {pending && (
          <div className="flex flex-col gap-5">
            <p className="text-[13px] leading-5" style={{ color: "var(--danger)" }}>
              지금까지 쌓은 연속 기록이 모두 초기화됩니다.
            </p>

            <div className="flex items-center gap-3">
              <div
                className="flex-1 flex flex-col items-center gap-1 px-3 py-4 rounded-lg text-center"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
              >
                <span className="text-4xl">{animalEmoji}</span>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {typeName}
                </p>
                <p className="num text-xs" style={{ color: "var(--color-bloom)", letterSpacing: 0 }}>
                  {streak}일 연속
                </p>
              </div>

              <span className="text-sm shrink-0" style={{ color: "var(--danger)" }}>
                →
              </span>

              <div
                className="flex-1 flex flex-col items-center gap-1 px-3 py-4 rounded-lg text-center"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
              >
                <span className="text-4xl">{pending.emoji}</span>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {pending.name}
                </p>
                <p className="num text-xs" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
                  0일 연속
                </p>
              </div>
            </div>

            <p
              className="text-xs leading-[18px] px-3.5 py-3 rounded-lg"
              style={{ color: "var(--danger)", background: "var(--danger-soft)", border: "1px solid var(--danger-line)" }}
            >
              연속 기록 {streak}일과 현재 단계 {stage.name}가 영구적으로 사라집니다. 되돌릴 수 없어요.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPending(null)}
                className="flex-1 h-[42px] rounded-full text-sm font-medium transition-opacity hover:opacity-75 cursor-pointer"
                style={{ border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
              >
                취소
              </button>
              <button
                onClick={() => selectAnimalType(pending.id, true)}
                className="flex-1 h-[42px] rounded-full text-sm font-semibold transition-opacity hover:opacity-85 cursor-pointer"
                style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger-line)" }}
              >
                변경하기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
