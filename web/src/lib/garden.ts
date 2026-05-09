import * as admin from "firebase-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* 클라이언트 안전 유틸은 garden-utils.ts에서 관리 — 여기서 re-export */
export {
  PLANT_LEVELS, ANIMAL_TYPES, ANIMAL_STAGES,
  getPlantLevel, nextPlantLevel, getAnimalStage, getAnimalEmoji,
} from "@/lib/garden-utils";
export type { PlantLevel, AnimalTypeId, AnimalStatus } from "@/lib/garden-utils";

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
