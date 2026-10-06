"use client";

/**
 * `/preview/garden` — 개발 전용 (page.tsx 참고). 정원 `/garden`의 동물 무대와 같은 컴포넌트(`PetStage`) · 같은 쓰다듬기 규칙(`tapPet`)을
 * 샘플 값으로 띄운다. 파라미터:
 *
 *   state=fed|peckish|starving|egg   동물 상태 (기본 fed)       type=cat|dog|rabbit (기본 cat)
 *   streak=N 연속 기록 · minutes=N 식물 경험치 · at=dawn|day|dusk|night 창밖 하늘 (기본 day · 기준일 KST 2026-09-17)
 *   today=N total=N  쓰다듬기 시작 값 (오늘 · 누적) · then=fed 4.5초 뒤 밥을 먹은 상태로 바뀐다 (먹는 연출 · 부화 확인)
 *   fallback=1       3D 대신 기존 SVG 동물을 강제로 띄운다
 */
import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

import PetStage from "@/components/garden/PetStage";
import { ANIMAL_TYPES, PET_DAILY_CAP, getAffectionLevel, getAnimalStage, type AnimalTypeId, type PetRecord } from "@/lib/garden-utils";
import { kstDateKey } from "@/lib/kst";
import { shownRecord, tapPet, type TapResult } from "@/lib/pet/affection";
import { petCondition } from "@/lib/pet/condition";

const Animal3D = dynamic(() => import("@/components/garden/Animal3D"), { ssr: false });

/** 기준 시각 — KST 2026-09-17 (목). 시간대별 하늘 */
const KST_HOUR = { dawn: 6, day: 12, dusk: 18, night: 22 } as const;
const atKst = (hour: number) => Date.UTC(2026, 8, 17, hour - 9, 0, 0);

const LAST_ANALYSIS: Record<string, string | undefined> = {
  fed: "2026-09-17",
  peckish: "2026-09-16",
  starving: "2026-09-14",
  egg: undefined,
};
const DEFAULT_STREAK: Record<string, number> = { fed: 12, peckish: 8, starving: 30, egg: 0 };
const THEN_AFTER_MS = 4500;

function Inner() {
  const q = useSearchParams();
  const state = q.get("state") ?? "fed";
  const type = (ANIMAL_TYPES.find((t) => t.id === q.get("type"))?.id ?? "cat") as AnimalTypeId;
  const at = (q.get("at") ?? "day") as keyof typeof KST_HOUR;
  const now = atKst(KST_HOUR[at] ?? KST_HOUR.day);
  const num = (key: string) => {
    const v = q.get(key);
    return v !== null && Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : null;
  };

  // `then=fed` — 이 시간 뒤 같은 동물이 분석을 마친 것처럼 배부름으로 바뀐다 (연속 기록이 하루 늘고 마지막 분석일이 오늘이 된다)
  const [fedNow, setFedNow] = useState(false);
  const thenFed = q.get("then") === "fed";
  useEffect(() => {
    if (!thenFed) return;
    const id = setTimeout(() => setFedNow(true), THEN_AFTER_MS);
    return () => clearTimeout(id);
  }, [thenFed]);

  const baseStreak = num("streak") ?? DEFAULT_STREAK[state] ?? 12;
  const streak = fedNow ? baseStreak + 1 : baseStreak;
  const lastAnalysisDate = fedNow ? LAST_ANALYSIS.fed : LAST_ANALYSIS[state];
  const condition = petCondition({ type, lastAnalysisDate }, now);

  // 쓰다듬기 — 정원 페이지와 같은 규칙(`tapPet`)으로 화면에 먼저 반영한다 (서버 전송은 흉내만: 보낸 횟수를 `__offloPetSends`에 남긴다)
  const dayKey = kstDateKey(now);
  const [pet, setPet] = useState<PetRecord>({ date: dayKey, today: num("today") ?? 0, total: num("total") ?? 0 });
  const petRef = useRef(pet);
  const onPet = (): TapResult => {
    const { state: next, result } = tapPet({ server: petRef.current, inflight: 0, pending: 0 }, dayKey);
    if (result.counted) {
      petRef.current = shownRecord(next, dayKey);
      setPet(petRef.current);
      const g = globalThis as { __offloPetSends?: number[] };
      (g.__offloPetSends ??= []).push(1);
    }
    return result;
  };
  const forceFallback = q.get("fallback") === "1";
  const level = getAffectionLevel(pet.total);
  const stage = getAnimalStage(streak);

  return (
    <main className="min-h-screen p-4">
      <section
        className="relative flex flex-col items-center justify-center w-full max-w-[720px] mx-auto min-h-[380px] lg:min-h-[560px] rounded-card overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
      >
        <div className="flex flex-col items-center gap-3 w-full px-3 py-4 sm:px-6 sm:py-6">
          <div className="w-full max-w-[480px]">
            {forceFallback ? (
              <Animal3D
                typeId={type}
                stage={stage}
                isHungry={condition === "starving"}
                effectiveStreak={streak}
                petToday={pet.today}
                petTotal={pet.total}
                onPet={() => {
                  onPet();
                }}
              />
            ) : (
            <PetStage
              type={type}
              streak={streak}
              condition={condition}
              totalMinutes={num("minutes") ?? 1450}
              now={now}
              onPet={onPet}
              renderFallback={() => (
                <Animal3D
                  typeId={type}
                  stage={stage}
                  isHungry={condition === "starving"}
                  effectiveStreak={streak}
                  petToday={pet.today}
                  petTotal={pet.total}
                  onPet={() => {
                    onPet();
                  }}
                />
              )}
            />
            )}
          </div>
          <p data-testid="preview-affection" className="text-xs" style={{ color: "var(--text-muted)" }}>
            친밀도 Lv.{level.level} {level.name} · 오늘 {pet.today}/{PET_DAILY_CAP}번 · 누적 {pet.total}
          </p>
        </div>
      </section>
      {/* 실제 정원 페이지는 무대 아래에 패널이 더 있어 스크롤된다 — 터치 스크롤 검증을 위해 같은 상황을 만든다 */}
      <div aria-hidden="true" style={{ height: 900 }} />
    </main>
  );
}

export default function PreviewGarden() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
