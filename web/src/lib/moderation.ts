import { apiError, getAdminFirestore } from "@/lib/firebase-admin";
import { kstDateKey } from "@/lib/kst";
import { prisma } from "@/lib/prisma";

/**
 * 커뮤니티 신고 · 차단 (M9 — Google Play 사용자 생성 콘텐츠(UGC) 정책).
 *
 * Play는 UGC가 있는 앱에 ① 글 · 댓글 · 사용자 신고 ② 사용자 차단 ③ 이용 규칙 동의 ④ 신고를 처리하는 체계를 요구한다.
 * 이 파일이 ①②④의 서버 쪽이다 (③은 앱이 첫 글쓰기 전에 받는다).
 *
 * **저장은 전부 Firestore의 서버(Admin SDK) 전용 경로다** — `firestore.rules`의 "그 외 모든 접근 차단"에 걸려 클라이언트가 읽지도 쓰지도 못한다 (DB 스키마 변경 없음):
 *   reports/{신고자uid}_{종류}_{대상id}      신고 원본 (운영자가 Firebase 콘솔에서 확인 · 멱등: 같은 사람이 같은 대상을 다시 신고해도 한 건)
 *   moderation/{종류}_{대상id}               대상별 요약 — 서로 다른 신고자 수 · **3명이 되면 자동 숨김**(hidden)
 *   users/{uid}/reported/{종류}_{대상id}     내가 신고한 것 — 나에게는 곧바로 숨긴다
 *   users/{uid}/blocks/{차단한 사용자의 id}   내가 차단한 사용자 — 그 사용자의 글 · 댓글이 나에게 안 보인다
 *   users/{uid}/reportUsage/{KST 날짜}       신고 남용 방지 — 하루 상한
 * `users/{uid}` 아래는 회원 탈퇴의 recursiveDelete가 함께 지운다. 탈퇴하면 그 사람이 한 신고 원본(`reports`)도 지운다 (`deleteReportsBy`) — 요약(`moderation`)에는 개인 정보가 없다.
 *
 * 신고 처리: 운영자가 Firebase 콘솔의 `reports`(status "open")를 보고 해당 글 · 댓글을 지운다. 서로 다른 신고자 3명이 되면 사람이 보기 전에도 모두에게서 숨긴다(작성자 본인은 계속 본다).
 */

export const REPORT_REASONS = ["spam", "abuse", "sexual", "privacy", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const TARGET_TYPES = ["post", "comment"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

/** 서로 다른 신고자가 이만큼 모이면 모두에게서 숨긴다 */
export const AUTO_HIDE_THRESHOLD = 3;
/** 한 사람이 하루(KST)에 낼 수 있는 신고 수 — 장난 · 괴롭힘 목적의 대량 신고를 막는다 */
export const MAX_REPORTS_PER_DAY = 30;
export const MAX_DETAIL_LENGTH = 300;
/** 한 사람의 차단 · 신고 목록을 읽는 상한 — 피드 쿼리의 `notIn`에 들어간다 */
const LIST_LIMIT = 500;

const keyOf = (type: TargetType, id: string) => `${type}_${id}`;

/** "post_abc" → { type: "post", id: "abc" }. 형식이 이상하면 null */
function parseKey(key: string): { type: TargetType; id: string } | null {
  const i = key.indexOf("_");
  if (i <= 0) return null;
  const type = key.slice(0, i);
  const id = key.slice(i + 1);
  return (TARGET_TYPES as readonly string[]).includes(type) && id ? { type: type as TargetType, id } : null;
}

/* ── 입력 검증 ─────────────────────────────────────────────── */

export function requireTarget(body: Record<string, unknown>): { targetType: TargetType; targetId: string } {
  const { targetType, targetId } = body;
  if (typeof targetType !== "string" || !(TARGET_TYPES as readonly string[]).includes(targetType)) {
    throw apiError("신고 · 차단할 대상의 종류(post · comment)가 필요합니다.", 400);
  }
  if (typeof targetId !== "string" || targetId.length === 0 || targetId.length > 128) {
    throw apiError("대상 ID가 유효하지 않습니다.", 400);
  }
  return { targetType: targetType as TargetType, targetId };
}

/** 대상의 작성자 — 없는 글 · 댓글이면 404 */
async function resolveAuthor(targetType: TargetType, targetId: string): Promise<{ authorUserId: string }> {
  const row =
    targetType === "post"
      ? await prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } })
      : await prisma.comment.findUnique({ where: { id: targetId }, select: { userId: true } });
  if (!row) throw apiError(targetType === "post" ? "게시글을 찾을 수 없습니다." : "댓글을 찾을 수 없습니다.", 404);
  return { authorUserId: row.userId };
}

/* ── 신고 ──────────────────────────────────────────────────── */

export interface ReportInput {
  targetType: TargetType;
  targetId: string;
  reason: unknown;
  detail?: unknown;
}

export interface ReportResult {
  /** 이미 신고한 대상이라 새로 쌓지 않았다 (멱등) */
  alreadyReported: boolean;
  /** 이 신고로 모두에게서 숨겨졌다 (또는 이미 숨겨져 있다) */
  hidden: boolean;
}

export async function reportContent(uid: string, userId: string, input: ReportInput, now: number = Date.now()): Promise<ReportResult> {
  const { targetType, targetId } = input;
  if (typeof input.reason !== "string" || !(REPORT_REASONS as readonly string[]).includes(input.reason)) {
    throw apiError("신고 사유를 골라주세요.", 400);
  }
  const reason = input.reason as ReportReason;
  let detail: string | null = null;
  if (input.detail !== undefined && input.detail !== null && input.detail !== "") {
    if (typeof input.detail !== "string") throw apiError("신고 내용이 올바르지 않습니다.", 400);
    const trimmed = input.detail.trim();
    if (trimmed.length > MAX_DETAIL_LENGTH) throw apiError(`신고 내용은 최대 ${MAX_DETAIL_LENGTH}자까지 쓸 수 있습니다.`, 400);
    detail = trimmed || null;
  }

  const { authorUserId } = await resolveAuthor(targetType, targetId);
  if (authorUserId === userId) throw apiError("내가 쓴 글 · 댓글은 신고할 수 없습니다.", 400);

  const key = keyOf(targetType, targetId);
  const db = getAdminFirestore();
  const reportRef = db.doc(`reports/${uid}_${key}`);
  const summaryRef = db.doc(`moderation/${key}`);
  const mineRef = db.doc(`users/${uid}/reported/${key}`);
  const usageRef = db.doc(`users/${uid}/reportUsage/${kstDateKey(now)}`);
  const iso = new Date(now).toISOString();

  return db.runTransaction(async (tx) => {
    const [reportSnap, summarySnap, usageSnap] = await Promise.all([tx.get(reportRef), tx.get(summaryRef), tx.get(usageRef)]);
    const count = typeof summarySnap.data()?.reportCount === "number" ? (summarySnap.data()!.reportCount as number) : 0;

    if (reportSnap.exists) {
      // 같은 사람이 같은 대상을 다시 신고했다 — 새로 쌓지 않는다 (내 숨김 표시만 확실히 해 둔다)
      tx.set(mineRef, { createdAt: iso }, { merge: true });
      return { alreadyReported: true, hidden: count >= AUTO_HIDE_THRESHOLD };
    }

    const used = typeof usageSnap.data()?.count === "number" ? (usageSnap.data()!.count as number) : 0;
    if (used >= MAX_REPORTS_PER_DAY) throw apiError("오늘 신고할 수 있는 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.", 429);

    const nextCount = count + 1;
    const hidden = nextCount >= AUTO_HIDE_THRESHOLD;
    tx.set(reportRef, { reporterUid: uid, reporterUserId: userId, targetType, targetId, targetUserId: authorUserId, reason, detail, status: "open", createdAt: iso });
    tx.set(summaryRef, { targetType, targetId, targetUserId: authorUserId, reportCount: nextCount, hidden, updatedAt: iso }, { merge: true });
    tx.set(mineRef, { createdAt: iso });
    tx.set(usageRef, { count: used + 1, updatedAt: iso }, { merge: true });
    return { alreadyReported: false, hidden };
  });
}

/* ── 차단 ──────────────────────────────────────────────────── */

export interface BlockedUser {
  userId: string;
  name: string;
  createdAt: string | null;
}

/** 글 · 댓글의 작성자를 차단한다 — 작성자 id를 클라이언트에 내려주지 않으려고 "대상"으로 가리킨다. 이미 차단했으면 그대로 둔다 (멱등) */
export async function blockAuthorOf(uid: string, userId: string, targetType: TargetType, targetId: string, now: number = Date.now()): Promise<BlockedUser> {
  const { authorUserId } = await resolveAuthor(targetType, targetId);
  if (authorUserId === userId) throw apiError("나 자신은 차단할 수 없습니다.", 400);

  const db = getAdminFirestore();
  const ref = db.doc(`users/${uid}/blocks/${authorUserId}`);
  const createdAt = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return (snap.data()?.createdAt as string | undefined) ?? null;
    const iso = new Date(now).toISOString();
    tx.set(ref, { createdAt: iso });
    return iso;
  });
  const author = await prisma.user.findUnique({ where: { id: authorUserId }, select: { name: true } });
  return { userId: authorUserId, name: author?.name ?? "알 수 없음", createdAt };
}

export async function unblockUser(uid: string, blockedUserId: string): Promise<void> {
  await getAdminFirestore().doc(`users/${uid}/blocks/${blockedUserId}`).delete();
}

/** 내가 차단한 사용자 — 최근에 차단한 순 */
export async function listBlocks(uid: string): Promise<BlockedUser[]> {
  const snap = await getAdminFirestore().collection(`users/${uid}/blocks`).limit(LIST_LIMIT).get();
  const entries = snap.docs.map((d) => ({ userId: d.id, createdAt: (d.data()?.createdAt as string | undefined) ?? null }));
  if (entries.length === 0) return [];
  const users = await prisma.user.findMany({ where: { id: { in: entries.map((e) => e.userId) } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return entries
    .map((e) => ({ ...e, name: nameOf.get(e.userId) ?? "탈퇴한 사용자" }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/* ── 피드 · 댓글 · 랭킹이 쓰는 필터 ─────────────────────────── */

export interface ViewerFilters {
  /** 내가 차단한 사용자 — 그 사용자의 글 · 댓글 · 랭킹 줄을 뺀다 */
  excludeUserIds: string[];
  /** 내가 신고한 글 */
  reportedPostIds: string[];
  /** 내가 신고한 댓글 */
  reportedCommentIds: string[];
  /** 신고가 모여 모두에게서 숨겨진 글 (작성자 본인에게는 보인다 — 쿼리에서 `OR userId`로 푼다) */
  hiddenPostIds: string[];
  hiddenCommentIds: string[];
}

export async function loadViewerFilters(uid: string): Promise<ViewerFilters> {
  const db = getAdminFirestore();
  const [blocks, reported, hidden] = await Promise.all([
    db.collection(`users/${uid}/blocks`).limit(LIST_LIMIT).get(),
    db.collection(`users/${uid}/reported`).limit(LIST_LIMIT).get(),
    db.collection("moderation").where("hidden", "==", true).limit(1000).get(),
  ]);
  const split = (ids: string[]) => {
    const post: string[] = [];
    const comment: string[] = [];
    for (const key of ids) {
      const parsed = parseKey(key);
      if (parsed?.type === "post") post.push(parsed.id);
      else if (parsed?.type === "comment") comment.push(parsed.id);
    }
    return { post, comment };
  };
  const mine = split(reported.docs.map((d) => d.id));
  const all = split(hidden.docs.map((d) => d.id));
  return {
    excludeUserIds: blocks.docs.map((d) => d.id),
    reportedPostIds: mine.post,
    reportedCommentIds: mine.comment,
    hiddenPostIds: all.post,
    hiddenCommentIds: all.comment,
  };
}

/* ── 회원 탈퇴 ─────────────────────────────────────────────── */

/** 이 사람이 한 신고 원본을 모두 지운다 (대상별 요약에는 개인 정보가 없어 그대로 둔다) */
export async function deleteReportsBy(uid: string): Promise<void> {
  const db = getAdminFirestore();
  for (let round = 0; round < 50; round++) {
    const snap = await db.collection("reports").where("reporterUid", "==", uid).limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
  }
}
