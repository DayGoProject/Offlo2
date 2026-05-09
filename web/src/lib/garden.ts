import * as admin from "firebase-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── 식물 레벨 정의 ───────────────────────────────────────── */

export const PLANT_LEVELS = [
  { level: 1, name: "씨앗",      minMinutes: 0,    emoji: "🌰" },
  { level: 2, name: "새싹",      minMinutes: 120,  emoji: "🌱" },
  { level: 3, name: "어린 식물", minMinutes: 480,  emoji: "🌿" },
  { level: 4, name: "꽃봉오리",  minMinutes: 1200, emoji: "🌸" },
  { level: 5, name: "활짝 꽃",   minMinutes: 2400, emoji: "🌺" },
  { level: 6, name: "열매",      minMinutes: 4800, emoji: "🍎" },
  { level: 7, name: "고목나무",  minMinutes: 9600, emoji: "🌳" },
] as const;

export type PlantLevel = typeof PLANT_LEVELS[number];

export function getPlantLevel(totalMinutes: number): PlantLevel {
  return [...PLANT_LEVELS].reverse().find((l) => totalMinutes >= l.minMinutes) ?? PLANT_LEVELS[0];
}

export function nextPlantLevel(current: PlantLevel): PlantLevel | null {
  const idx = PLANT_LEVELS.findIndex((l) => l.level === current.level);
  return idx < PLANT_LEVELS.length - 1 ? PLANT_LEVELS[idx + 1] : null;
}

/* ── 동물 스테이지 정의 ───────────────────────────────────── */

export const ANIMAL_TYPES = [
  { id: "cat",    name: "고양이", emoji: "🐱" },
  { id: "dog",    name: "강아지", emoji: "🐶" },
  { id: "rabbit", name: "토끼",   emoji: "🐰" },
] as const;

export type AnimalTypeId = typeof ANIMAL_TYPES[number]["id"];

export const ANIMAL_STAGES = [
  { minStreak: 0,   name: "알",       status: "egg"      },
  { minStreak: 1,   name: "아기",     status: "baby"     },
  { minStreak: 7,   name: "성장 중",  status: "growing"  },
  { minStreak: 21,  name: "성체",     status: "adult"    },
  { minStreak: 60,  name: "강화 성체", status: "enhanced" },
  { minStreak: 120, name: "전설",     status: "legend"   },
] as const;

export type AnimalStatus = typeof ANIMAL_STAGES[number]["status"];

export function getAnimalStage(streak: number): typeof ANIMAL_STAGES[number] {
  return [...ANIMAL_STAGES].reverse().find((s) => streak >= s.minStreak) ?? ANIMAL_STAGES[0];
}

/* 동물 타입 + 스테이지 조합 이모지 */
export function getAnimalEmoji(typeId: AnimalTypeId | null, streak: number): string {
  if (!typeId) return "🥚";
  const stage = getAnimalStage(streak);
  const stageEmoji: Record<AnimalStatus, Record<AnimalTypeId, string>> = {
    egg:      { cat: "🥚",  dog: "🥚",  rabbit: "🥚"  },
    baby:     { cat: "🐱",  dog: "🐶",  rabbit: "🐰"  },
    growing:  { cat: "😺",  dog: "🐕",  rabbit: "🐇"  },
    adult:    { cat: "🐈",  dog: "🦮",  rabbit: "🐇"  },
    enhanced: { cat: "🐈‍⬛", dog: "🦴",  rabbit: "🐇"  },
    legend:   { cat: "🦁",  dog: "🐺",  rabbit: "🦊"  },
  };
  return stageEmoji[stage.status][typeId];
}

/* ── KST 날짜 헬퍼 ────────────────────────────────────────── */

function kstDateStr(offset = 0): string {
  const KST = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + KST + offset).toISOString().slice(0, 10);
}

/* ── 식물 경험치 적립 (Admin SDK) ─────────────────────────── */

export async function addPlantExp(uid: string, minutes: number): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.doc(`users/${uid}/garden/plant`);
  await ref.set(
    {
      totalDetoxMinutes: admin.firestore.FieldValue.increment(minutes),
      lastUpdated: new Date().toISOString(),
    },
    { merge: true }
  );
}

/* ── 동물 스트릭 업데이트 (Admin SDK) ─────────────────────── */

export async function updateAnimalStreak(uid: string): Promise<number> {
  const db = getAdminFirestore();
  const ref = db.doc(`users/${uid}/garden/animal`);
  const snap = await ref.get();
  const data = snap.exists ? snap.data()! : null;

  const todayKST = kstDateStr();
  const yesterdayKST = kstDateStr(-86400000);

  let newStreak = 1;
  if (data) {
    if (data.lastAnalysisDate === todayKST) {
      return data.streak ?? 1; // 오늘 이미 업데이트됨
    } else if (data.lastAnalysisDate === yesterdayKST) {
      newStreak = (data.streak ?? 0) + 1;
    }
    // 2일+ 공백이면 1로 리셋
  }

  await ref.set(
    { streak: newStreak, lastAnalysisDate: todayKST, lastUpdated: new Date().toISOString() },
    { merge: true }
  );
  return newStreak;
}

/* ── 배지 지급 (중복 방지) ────────────────────────────────── */

export async function awardBadge(userId: string, name: string): Promise<void> {
  const existing = await prisma.badge.findFirst({ where: { userId, name } });
  if (!existing) await prisma.badge.create({ data: { userId, name } });
}

/* ── 분석 완료 시 게이미피케이션 처리 ─────────────────────── */

export async function onAnalysisComplete(
  uid: string,
  userId: string,
  periodType: "daily" | "weekly",
  totalAnalyses: number
): Promise<void> {
  const expGain = periodType === "weekly" ? 30 : 10;
  let streak = 0;

  await Promise.all([
    addPlantExp(uid, expGain),
    periodType === "daily"
      ? updateAnimalStreak(uid).then((s) => { streak = s; })
      : Promise.resolve(),
  ]);

  // 배지 조건 체크
  const badges: Promise<void>[] = [];
  if (totalAnalyses === 1) badges.push(awardBadge(userId, "첫 분석"));
  if (periodType === "weekly") badges.push(awardBadge(userId, "주간 분석 완료"));
  if (streak >= 7) badges.push(awardBadge(userId, "7일 연속"));
  await Promise.all(badges);
}

/* ── 목표 완료 시 게이미피케이션 처리 ─────────────────────── */

export async function onGoalCompleted(uid: string, userId: string): Promise<void> {
  await Promise.all([
    addPlantExp(uid, 20),
    awardBadge(userId, "목표 달성"),
  ]);
}
