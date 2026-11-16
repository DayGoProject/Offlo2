import { kstDateKey } from "@/lib/kst";

/**
 * 목표 화면 계산 — **클라이언트 · 서버 양쪽 안전** 순수 함수. 앱 `Offlo_APP/src/logic/goals.ts`와 같은 규칙이다.
 *
 * **날짜는 날짜 키("2026-10-13")로만 다루고 "오늘"은 KST다.** 서버는 고른 날짜를 UTC 자정으로 저장하므로 `iso.slice(0, 10)`이
 * 사용자가 고른 날짜 그대로다. 예전 웹은 기기 시간대의 `setHours(0)`으로 세서 시간대에 따라 하루씩 어긋났고,
 * 마지막 날에도 "기간이 끝났어요"라고 했으며, 시작 전 목표가 "0일 지남"으로 보였다.
 */

export const GOAL_TITLE_MAX = 200;
export const GOAL_MINUTES_MAX = 10080;
export const GOAL_DEFAULT_DAYS = 7;

/** 서버가 준 날짜(UTC 자정 ISO) → 날짜 키 */
export function goalDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** 날짜 키 → "2026.10.13" (기기 시간대를 거치지 않는다) */
export function fmtDateKey(key: string): string {
  return key.replaceAll("-", ".");
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  return DATE_KEY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** b − a (일). 형식이 이상하면 null */
export function daysBetween(a: string, b: string): number | null {
  if (!isDateKey(a) || !isDateKey(b)) return null;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export interface GoalSpan {
  /** 기간 전체 일 수 (시작일 · 종료일 포함) */
  total: number;
  /** 시작일부터 오늘까지 지난 일 수 (오늘 포함 · 0 ~ total) */
  done: number;
  /** 남은 일 수 (0이면 오늘이 마지막 날이거나 이미 끝났다 — `expired`로 가른다) */
  left: number;
  /** 0~100 */
  pct: number;
  /** 아직 시작 전이면 시작까지 남은 일 수 (시작했으면 0) */
  startsIn: number;
  /** 종료일이 지났다 (종료일 당일은 아직 아니다) */
  expired: boolean;
}

/** 기간 대비 경과일 — 달성률이 아니라 **진행률**이다 (달성 여부는 사용자가 직접 완료 처리한다) */
export function goalSpan(goal: { startDate: string; endDate: string }, now: number = Date.now()): GoalSpan {
  const start = goalDateKey(goal.startDate);
  const end = goalDateKey(goal.endDate);
  const today = kstDateKey(now);
  const length = daysBetween(start, end);
  const sinceStart = daysBetween(start, today);
  const total = Math.max(1, (length ?? 0) + 1);
  const done = sinceStart === null ? 0 : Math.max(0, Math.min(total, sinceStart + 1));
  const startsIn = sinceStart !== null && sinceStart < 0 ? -sinceStart : 0;
  // 끝난 것은 종료일 **다음 날**부터다 — 종료일 당일은 남은 날이 0이어도 아직 기간 안이다
  const pastEnd = daysBetween(end, today);
  return {
    total,
    done,
    left: total - done,
    pct: Math.round((done / total) * 100),
    startsIn,
    expired: pastEnd !== null && pastEnd > 0,
  };
}

/** 진행 줄 — "7일 중 1일 지남 · 6일 남음" · 시작 전 · 마지막 날 · 끝남 */
export function goalNote(span: GoalSpan): string {
  if (span.startsIn > 0) return `아직 시작 전이에요 · ${span.startsIn}일 뒤 시작`;
  const base = `${span.total}일 중 ${span.done}일 지남`;
  if (span.expired) return `${base} · 기간이 끝났어요`;
  return span.left === 0 ? `${base} · 오늘이 마지막 날이에요` : `${base} · ${span.left}일 남음`;
}

/* ── 입력 ──────────────────────────────────────────────────── */

export interface GoalForm {
  title: string;
  targetMinutes: number;
  startDate: string;
  endDate: string;
}

/** 새 목표 기본값 — 오늘(KST)부터 일주일 */
export function defaultGoalForm(now: number = Date.now()): GoalForm {
  const today = kstDateKey(now);
  return { title: "", targetMinutes: 60, startDate: today, endDate: addDays(today, GOAL_DEFAULT_DAYS) };
}

export function formFromGoal(goal: { title: string; targetMinutes: number; startDate: string; endDate: string }): GoalForm {
  return {
    title: goal.title,
    targetMinutes: goal.targetMinutes,
    startDate: goalDateKey(goal.startDate),
    endDate: goalDateKey(goal.endDate),
  };
}

/** 서버와 같은 규칙으로 미리 걸러 낸다 — 통과하면 null, 아니면 문구 */
export function validateGoalForm(form: GoalForm): string | null {
  const title = form.title.trim();
  if (!title) return "제목을 입력해주세요.";
  if (title.length > GOAL_TITLE_MAX) return `제목은 ${GOAL_TITLE_MAX}자까지 쓸 수 있어요.`;
  const m = form.targetMinutes;
  if (!Number.isInteger(m) || m < 1 || m > GOAL_MINUTES_MAX) return `하루 목표 시간은 1~${GOAL_MINUTES_MAX}분으로 정해주세요.`;
  if (!isDateKey(form.startDate) || !isDateKey(form.endDate)) return "기간을 설정해주세요.";
  if (form.endDate <= form.startDate) return "종료일은 시작일 이후여야 합니다.";
  return null;
}

/** 수정 요청 본문 — 바뀐 필드만 (서버 PATCH는 받은 필드만 고친다). 바뀐 것이 없으면 null */
export function patchFromForm(
  goal: { title: string; targetMinutes: number; startDate: string; endDate: string },
  form: GoalForm
): Partial<GoalForm> | null {
  const patch: Partial<GoalForm> = {};
  const title = form.title.trim();
  if (title !== goal.title) patch.title = title;
  if (form.targetMinutes !== goal.targetMinutes) patch.targetMinutes = form.targetMinutes;
  if (form.startDate !== goalDateKey(goal.startDate)) patch.startDate = form.startDate;
  if (form.endDate !== goalDateKey(goal.endDate)) patch.endDate = form.endDate;
  return Object.keys(patch).length === 0 ? null : patch;
}
