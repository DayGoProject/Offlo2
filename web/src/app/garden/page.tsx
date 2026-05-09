"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import AppSidebar from "@/components/AppSidebar";
import {
  PLANT_LEVELS, ANIMAL_TYPES, ANIMAL_STAGES,
  getPlantLevel, nextPlantLevel, getAnimalStage, getAnimalEmoji,
  type AnimalTypeId,
} from "@/lib/garden";

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
  const diff = Math.floor(
    (new Date(todayKST).getTime() - new Date(dateStr).getTime()) / 86400000
  );
  return diff;
}

/* ── SVG 식물 컴포넌트 ─────────────────────────────────────── */

function PlantSVG({ level }: { level: number }) {
  const G = "#3DDB87";
  const GD = "rgba(61,219,135,0.5)";
  const STEM = "#2DB86E";

  return (
    <svg width="140" height="180" viewBox="0 0 140 180" fill="none">
      {/* 화분 */}
      <rect x="42" y="148" width="56" height="8" rx="3" fill="rgba(160,120,80,0.6)" />
      <path d="M38 156 L46 180 H94 L102 156 Z" fill="rgba(160,120,80,0.5)" />
      <rect x="38" y="143" width="64" height="14" rx="5" fill="rgba(120,80,50,0.6)" />
      {/* 흙 */}
      <ellipse cx="70" cy="145" rx="28" ry="5" fill="rgba(101,67,33,0.5)" />

      {/* 레벨 1: 씨앗 */}
      {level === 1 && (
        <ellipse cx="70" cy="135" rx="8" ry="6" fill="rgba(160,120,60,0.8)" />
      )}

      {/* 레벨 2: 새싹 */}
      {level === 2 && (
        <>
          <line x1="70" y1="142" x2="70" y2="110" stroke={STEM} strokeWidth="3" strokeLinecap="round" />
          <path d="M70 120 Q55 110 52 98 Q65 100 70 115" fill={G} opacity="0.9" />
          <path d="M70 125 Q85 115 88 103 Q75 105 70 120" fill={G} opacity="0.7" />
        </>
      )}

      {/* 레벨 3: 어린 식물 */}
      {level === 3 && (
        <>
          <line x1="70" y1="142" x2="70" y2="90" stroke={STEM} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M70 130 Q50 118 46 102 Q63 106 70 125" fill={G} opacity="0.9" />
          <path d="M70 118 Q90 106 94 90 Q77 94 70 112" fill={G} opacity="0.8" />
          <path d="M70 104 Q54 93 50 78 Q65 82 70 98" fill={GD} opacity="0.9" />
          <circle cx="70" cy="89" r="5" fill={G} />
        </>
      )}

      {/* 레벨 4: 꽃봉오리 */}
      {level === 4 && (
        <>
          <line x1="70" y1="142" x2="70" y2="72" stroke={STEM} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M70 132 Q46 118 42 98 Q62 102 70 126" fill={G} />
          <path d="M70 115 Q94 101 98 81 Q78 85 70 109" fill={G} opacity="0.8" />
          <path d="M70 98 Q50 85 48 66 Q65 70 70 92" fill={GD} />
          {/* 봉오리 */}
          <ellipse cx="70" cy="64" rx="8" ry="12" fill="#ff9fb2" opacity="0.85" />
          <path d="M65 70 Q70 60 75 70" fill="#3DDB87" />
        </>
      )}

      {/* 레벨 5: 활짝 꽃 */}
      {level === 5 && (
        <>
          <line x1="70" y1="142" x2="70" y2="75" stroke={STEM} strokeWidth="4" strokeLinecap="round" />
          <path d="M70 132 Q44 116 40 94 Q62 99 70 126" fill={G} />
          <path d="M70 112 Q96 96 100 74 Q78 79 70 106" fill={G} opacity="0.85" />
          {/* 꽃잎 */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx={70 + 14 * Math.cos((deg * Math.PI) / 180)}
              cy={60 + 14 * Math.sin((deg * Math.PI) / 180)}
              rx="8" ry="5"
              fill="#ff9fb2"
              opacity="0.9"
              transform={`rotate(${deg} ${70 + 14 * Math.cos((deg * Math.PI) / 180)} ${60 + 14 * Math.sin((deg * Math.PI) / 180)})`}
            />
          ))}
          <circle cx="70" cy="60" r="8" fill="#FFD700" />
        </>
      )}

      {/* 레벨 6: 열매 */}
      {level === 6 && (
        <>
          <line x1="70" y1="142" x2="70" y2="65" stroke={STEM} strokeWidth="4" strokeLinecap="round" />
          <path d="M70 132 Q40 114 36 88 Q60 95 70 126" fill={G} />
          <path d="M70 110 Q100 92 104 66 Q80 73 70 104" fill={G} opacity="0.85" />
          <path d="M70 88 Q46 72 44 50 Q64 56 70 82" fill={GD} />
          {/* 꽃 */}
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx={70 + 11 * Math.cos((deg * Math.PI) / 180)}
              cy={52 + 11 * Math.sin((deg * Math.PI) / 180)}
              rx="6" ry="4"
              fill="#ff9fb2"
              opacity="0.85"
              transform={`rotate(${deg} ${70 + 11 * Math.cos((deg * Math.PI) / 180)} ${52 + 11 * Math.sin((deg * Math.PI) / 180)})`}
            />
          ))}
          {/* 열매 */}
          <circle cx="52" cy="105" r="7" fill="#ff6b6b" />
          <circle cx="88" cy="95" r="8" fill="#ff6b6b" />
          <circle cx="70" cy="115" r="6" fill="#ff8c42" />
        </>
      )}

      {/* 레벨 7: 고목나무 */}
      {level === 7 && (
        <>
          {/* 줄기 */}
          <path d="M62 142 L62 85 Q62 65 70 55 Q78 65 78 85 L78 142" fill="rgba(101,67,33,0.7)" />
          {/* 가지들 */}
          <line x1="62" y1="110" x2="35" y2="88" stroke="rgba(101,67,33,0.6)" strokeWidth="5" strokeLinecap="round" />
          <line x1="78" y1="105" x2="105" y2="83" stroke="rgba(101,67,33,0.6)" strokeWidth="5" strokeLinecap="round" />
          <line x1="62" y1="88" x2="42" y2="68" stroke="rgba(101,67,33,0.5)" strokeWidth="4" strokeLinecap="round" />
          <line x1="78" y1="82" x2="98" y2="62" stroke="rgba(101,67,33,0.5)" strokeWidth="4" strokeLinecap="round" />
          {/* 수관 */}
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

  async function selectAnimalType(typeId: AnimalTypeId) {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "garden", "animal");
    await setDoc(ref, { type: typeId, streak: animal.streak, lastAnalysisDate: animal.lastAnalysisDate ?? null, lastUpdated: new Date().toISOString() }, { merge: true });
    setAnimal((prev) => ({ ...prev, type: typeId }));
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
  const isHungry = sinceLastAnalysis >= 2;
  const effectiveStreak = animal.type ? animal.streak : 0;
  const animalStage = getAnimalStage(effectiveStreak);
  const nextAnimalStage = [...ANIMAL_STAGES].find((s) => s.minStreak > effectiveStreak);
  const animalEmoji = getAnimalEmoji(animal.type, effectiveStreak);
  const animalTypeName = ANIMAL_TYPES.find((t) => t.id === animal.type)?.name ?? "";

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

            {/* 메인 카드 2열 */}
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

                {/* 식물 SVG */}
                <div className="flex justify-center my-2">
                  <PlantSVG level={plantLevel.level} />
                </div>

                {/* 진행도 */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>누적 디톡스 {fmt(totalMin)}</span>
                    {nextLevel && <span>다음 레벨까지 {fmt(nextLevel.minMinutes - totalMin)}</span>}
                    {!nextLevel && <span className="text-brand font-bold">최고 레벨 달성!</span>}
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(plantProgress, 100)}%`, background: "#3DDB87" }}
                    />
                  </div>
                  {nextLevel && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {nextLevel.emoji} {nextLevel.name}까지 {Math.round(100 - plantProgress)}% 남음
                    </p>
                  )}
                </div>

                {/* 레벨 로드맵 */}
                <div className="mt-5 flex items-center justify-between">
                  {PLANT_LEVELS.map((l) => (
                    <div key={l.level} className="flex flex-col items-center gap-1">
                      <span className={`text-lg transition-all ${l.level <= plantLevel.level ? "" : "opacity-20"}`}>
                        {l.emoji}
                      </span>
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: l.level <= plantLevel.level ? "#3DDB87" : "var(--bg-bar)" }}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* 반려 동물 */}
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

                {/* 동물 미선택 → 선택 UI */}
                {!animal.type || selectingAnimal ? (
                  <div className="flex flex-col items-center gap-5 py-6">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      함께할 동물을 선택하세요
                    </p>
                    <div className="flex gap-4">
                      {ANIMAL_TYPES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => selectAnimalType(t.id)}
                          className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl transition-all hover:scale-105"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
                        >
                          <span className="text-4xl">{t.emoji}</span>
                          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                        </button>
                      ))}
                    </div>
                    {animal.type && (
                      <button onClick={() => setSelectingAnimal(false)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                        취소
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 동물 표시 */}
                    <div className="flex flex-col items-center py-4 gap-3">
                      {/* 배고픔 경고 */}
                      {isHungry && (
                        <div className="text-xs px-3 py-1.5 rounded-full font-semibold"
                          style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                          {sinceLastAnalysis >= 3 ? "😢 너무 배고파요! 스트릭이 리셋됐어요" : "😟 배고파해요! 오늘 분석을 해주세요"}
                        </div>
                      )}

                      <div className="relative">
                        <span className="text-8xl">{animalEmoji}</span>
                        {isHungry && (
                          <span className="absolute -top-1 -right-1 text-2xl animate-bounce">💧</span>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                          {animalTypeName} · {animalStage.name}
                        </p>
                        <p className="text-sm mt-1 text-brand font-bold">🔥 {effectiveStreak}일 연속</p>
                      </div>

                      {/* 다음 단계 진행도 */}
                      {nextAnimalStage && (
                        <div className="w-full space-y-1.5 mt-1">
                          <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                            <span>{animalStage.name}</span>
                            <span>{nextAnimalStage.name}까지 {nextAnimalStage.minStreak - effectiveStreak}일</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(((effectiveStreak - (ANIMAL_STAGES.find(s => s.status === animalStage.status)?.minStreak ?? 0)) / (nextAnimalStage.minStreak - (ANIMAL_STAGES.find(s => s.status === animalStage.status)?.minStreak ?? 0))) * 100, 100)}%`,
                                background: "#3DDB87",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 단계 로드맵 */}
                    <div className="mt-4 flex items-center justify-between">
                      {ANIMAL_STAGES.map((s) => {
                        const reached = effectiveStreak >= s.minStreak;
                        return (
                          <div key={s.status} className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-bold ${reached ? "text-brand" : ""} transition-all`}
                              style={{ color: reached ? "#3DDB87" : "var(--text-muted)" }}>
                              {s.minStreak === 0 ? "시작" : `${s.minStreak}일`}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full"
                              style={{ background: reached ? "#3DDB87" : "var(--bg-bar)" }} />
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setSelectingAnimal(true)}
                      className="mt-4 text-xs w-full text-center py-1.5 rounded-lg transition-colors hover:bg-white/[0.04]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      동물 변경하기
                    </button>
                  </>
                )}
              </Card>
            </div>

            {/* 하단 요약 통계 */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "식물 레벨", value: `Lv.${plantLevel.level} · ${plantLevel.name}` },
                { label: "누적 디톡스", value: fmt(totalMin) },
                { label: "현재 스트릭", value: `${effectiveStreak}일 연속` },
                { label: "동물 단계", value: animal.type ? animalStage.name : "미선택" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl px-4 py-3"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="text-sm font-bold text-brand">{value}</p>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
