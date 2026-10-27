import { apiError, getAdminAuth, getAdminFirestore, verifyIdToken } from "@/lib/firebase-admin";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { REPORT_REASONS, requireTarget, type ReportReason, type TargetType } from "@/lib/moderation";
import { communityActive, emailKey, readSanction, type SanctionDoc } from "@/lib/sanctions";

/**
 * 관리자 신고 처리 (M9) — 신고 큐 조회 · 기각 · 삭제 · 경고 / 커뮤니티 정지 / 계정 영구 정지 · 해제.
 * 신고를 쌓는 쪽은 `lib/moderation.ts`, 제재 기록을 읽는 쪽(커뮤니티 쓰기 · 가입 차단)은 `lib/sanctions.ts`다. 이 파일은 **`/api/admin/*` 라우트만** import한다.
 *
 * 관리자 = 환경변수 `ADMIN_UIDS`(쉼표로 구분한 Firebase uid)에 든 사람. 아니면 **404**를 준다 (관리 화면이 있다는 사실도 숨긴다).
 *
 * 저장 (전부 Firestore 서버 전용 · DB 스키마 변경 없음)
 *   reports/*                신고 원본 — 처리하면 status가 "dismissed"(기각) · "actioned"(조치함)로 바뀐다 (신고자 신원은 관리 화면에 내려주지 않는다)
 *   moderation/{종류}_{id}   신고 큐 — 처리하면 지운다
 *   sanctions/{이메일 해시}   제재 기록 (`lib/sanctions.ts`)
 *   moderationLog/*          관리자가 한 일의 기록 (누가 · 언제 · 무엇을)
 * **신고 수만으로 자동 정지하지 않는다** — 3명이 모이면 숨기기만 하고(`lib/moderation.ts`) 제재는 사람이 정한다 (여러 명이 짜고 신고해 사람을 정지시키는 것을 막는다).
 */

export type SanctionKind = "warn" | "community" | "ban";
/** 커뮤니티 정지 기간(일) — null은 영구 */
export const COMMUNITY_DAYS = [7, 30, null] as const;
export type CommunityDays = (typeof COMMUNITY_DAYS)[number];

export interface SanctionRequest {
  kind: SanctionKind;
  /** kind === "community"일 때만 */
  days: CommunityDays;
  /** 사용자에게 알리는 사유(신고 사유 분류) */
  reason: ReportReason;
}

/** 정지가 끝났거나 해제된 기록 · 관리자 처리 기록을 이만큼 지나면 지운다 (개인정보 처리방침과 같다) */
export const RETENTION_DAYS = 365;

const DAY = 86_400_000;

const REASON_LABEL: Record<ReportReason, string> = {
  spam: "스팸 · 광고",
  abuse: "욕설 · 혐오 · 괴롭힘",
  sexual: "음란 · 선정적인 내용",
  privacy: "개인정보 노출 · 사칭",
  other: "커뮤니티 이용 규칙 위반",
};

/* ── 관리자 확인 ───────────────────────────────────────────── */

export async function requireAdmin(req: Request): Promise<string> {
  const uid = await verifyIdToken(req); // 토큰이 없거나 틀리면 401
  const allowed = (process.env.ADMIN_UIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.includes(uid)) throw apiError("Not Found", 404);
  return uid;
}

/* ── 입력 해석 ─────────────────────────────────────────────── */

export interface ResolveInput {
  targetType: TargetType;
  targetId: string;
  action: "dismiss" | "delete";
  sanction: SanctionRequest | null;
}

export function parseSanction(raw: unknown): SanctionRequest {
  const s = (raw ?? {}) as Record<string, unknown>;
  if (s.kind !== "warn" && s.kind !== "community" && s.kind !== "ban") throw apiError("제재 종류(warn · community · ban)가 필요합니다.", 400);
  let days: CommunityDays = null;
  if (s.kind === "community") {
    if (!(COMMUNITY_DAYS as readonly unknown[]).includes(s.days === undefined ? "?" : s.days)) throw apiError("커뮤니티 정지 기간은 7일 · 30일 · 영구(null)만 쓸 수 있습니다.", 400);
    days = s.days as CommunityDays;
  }
  const reason = s.reason === undefined ? "other" : s.reason;
  if (typeof reason !== "string" || !(REPORT_REASONS as readonly string[]).includes(reason)) throw apiError("제재 사유가 올바르지 않습니다.", 400);
  return { kind: s.kind, days, reason: reason as ReportReason };
}

export function parseResolve(body: unknown): ResolveInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const { targetType, targetId } = requireTarget(b);
  if (b.action !== "dismiss" && b.action !== "delete") throw apiError("처리 방법(dismiss · delete)이 필요합니다.", 400);
  if (b.sanction !== undefined && b.sanction !== null && b.action === "dismiss") throw apiError("기각에는 제재를 함께 줄 수 없습니다.", 400);
  return { targetType, targetId, action: b.action, sanction: b.sanction === undefined || b.sanction === null ? null : parseSanction(b.sanction) };
}

/* ── 신고 큐 ───────────────────────────────────────────────── */

export interface QueueItem {
  key: string;
  targetType: TargetType;
  targetId: string;
  reportCount: number;
  /** 신고 3명으로 모두에게 숨겨진 상태 */
  hidden: boolean;
  updatedAt: string;
  content: string;
  badgeName: string | null;
  /** 댓글이면 달린 글의 id */
  postId: string | null;
  createdAt: string;
  /** 신고자 신원은 담지 않는다 — 사유 · 내용 · 시각만 */
  reports: { reason: ReportReason; detail: string | null; createdAt: string }[];
  author: AuthorInfo;
}

export interface AuthorInfo {
  userId: string;
  name: string;
  email: string;
  strikes: number;
  banned: boolean;
  /** 커뮤니티 정지 중이면 끝나는 시각(영구는 null) — 아니면 undefined */
  communityUntil: string | null | undefined;
}

function authorInfo(user: { id: string; name: string; email: string }, sanction: SanctionDoc | null, now: number): AuthorInfo {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    strikes: sanction?.strikes ?? 0,
    banned: Boolean(sanction?.banned),
    communityUntil: communityActive(sanction, now) ? (sanction!.community!.until as string | null) : undefined,
  };
}

export async function listReportQueue(now: number = Date.now()): Promise<QueueItem[]> {
  const db = getAdminFirestore();
  const [summaries, open] = await Promise.all([db.collection("moderation").limit(200).get(), db.collection("reports").where("status", "==", "open").limit(1000).get()]);

  const reportsByKey = new Map<string, QueueItem["reports"]>();
  for (const doc of open.docs) {
    const r = doc.data() as { targetType: TargetType; targetId: string; reason: ReportReason; detail: string | null; createdAt: string };
    const key = `${r.targetType}_${r.targetId}`;
    (reportsByKey.get(key) ?? reportsByKey.set(key, []).get(key)!).push({ reason: r.reason, detail: r.detail ?? null, createdAt: r.createdAt });
  }

  type Summary = { targetType: TargetType; targetId: string; reportCount: number; hidden: boolean; updatedAt: string };
  const rows = summaries.docs.map((doc) => ({ doc, data: doc.data() as Summary })).filter((r) => r.data.targetType && r.data.targetId);
  const postIds = rows.filter((r) => r.data.targetType === "post").map((r) => r.data.targetId);
  const commentIds = rows.filter((r) => r.data.targetType === "comment").map((r) => r.data.targetId);

  const [posts, comments] = await Promise.all([
    postIds.length ? prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, userId: true, content: true, badgeName: true, createdAt: true } }) : [],
    commentIds.length ? prisma.comment.findMany({ where: { id: { in: commentIds } }, select: { id: true, userId: true, postId: true, content: true, createdAt: true } }) : [],
  ]);
  const userIds = [...new Set([...posts.map((p) => p.userId), ...comments.map((c) => c.userId)])];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  const userById = new Map(users.map((u) => [u.id, u]));
  const sanctionByUser = new Map<string, SanctionDoc | null>(await Promise.all(users.map(async (u): Promise<[string, SanctionDoc | null]> => {
    const key = emailKey(u.email);
    return [u.id, key ? await readSanction(key) : null];
  })));

  const items: QueueItem[] = [];
  for (const { doc, data } of rows) {
    const key = `${data.targetType}_${data.targetId}`;
    const post = data.targetType === "post" ? posts.find((p) => p.id === data.targetId) : undefined;
    const comment = data.targetType === "comment" ? comments.find((c) => c.id === data.targetId) : undefined;
    const row = post ?? comment;
    const user = row ? userById.get(row.userId) : undefined;
    if (!row || !user) {
      // 작성자가 글을 지웠거나 탈퇴했다 — 처리할 것이 없으니 큐에서 치운다
      await doc.ref.delete().catch(() => {});
      continue;
    }
    items.push({
      key,
      targetType: data.targetType,
      targetId: data.targetId,
      reportCount: data.reportCount ?? 0,
      hidden: Boolean(data.hidden),
      updatedAt: data.updatedAt ?? "",
      content: row.content,
      badgeName: post?.badgeName ?? null,
      postId: comment?.postId ?? null,
      createdAt: new Date(row.createdAt).toISOString(),
      reports: (reportsByKey.get(key) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      author: authorInfo(user, sanctionByUser.get(user.id) ?? null, now),
    });
  }
  // 모두에게 숨겨진 것 먼저 · 신고가 많은 것 · 최근 신고
  return items.sort((a, b) => Number(b.hidden) - Number(a.hidden) || b.reportCount - a.reportCount || b.updatedAt.localeCompare(a.updatedAt));
}

/* ── 처리 기록 ─────────────────────────────────────────────── */

async function writeLog(entry: Record<string, unknown>, now: number): Promise<void> {
  await getAdminFirestore()
    .collection("moderationLog")
    .add({ ...entry, createdAt: new Date(now).toISOString() });
}

/* ── 기각 · 삭제 ───────────────────────────────────────────── */

export interface ResolveResult {
  ok: true;
  /** 글 · 댓글을 실제로 지웠다 (이미 없었으면 false) */
  deleted: boolean;
  sanction: AppliedSanction | null;
}

async function closeReports(adminUid: string, targetType: TargetType, targetId: string, status: "dismissed" | "actioned", now: number): Promise<void> {
  const db = getAdminFirestore();
  const snap = await db.collection("reports").where("targetId", "==", targetId).get();
  const mine = snap.docs.filter((d) => (d.data() as { targetType: TargetType }).targetType === targetType);
  for (let i = 0; i < mine.length; i += 400) {
    const batch = db.batch();
    for (const d of mine.slice(i, i + 400)) batch.set(d.ref, { status, resolvedAt: new Date(now).toISOString(), resolvedBy: adminUid }, { merge: true });
    await batch.commit();
  }
  await db.doc(`moderation/${targetType}_${targetId}`).delete(); // 큐에서 치운다
}

export async function resolveReport(adminUid: string, input: ResolveInput, now: number = Date.now()): Promise<ResolveResult> {
  const { targetType, targetId, action, sanction } = input;
  const db = getAdminFirestore();
  const summarySnap = await db.doc(`moderation/${targetType}_${targetId}`).get();
  const summaryUserId = (summarySnap.data() as { targetUserId?: string } | undefined)?.targetUserId ?? null;

  if (action === "dismiss") {
    if (!summarySnap.exists) throw apiError("이미 처리된 신고입니다.", 404);
    await closeReports(adminUid, targetType, targetId, "dismissed", now);
    await writeLog({ action: "dismiss", by: adminUid, targetType, targetId }, now);
    return { ok: true, deleted: false, sanction: null };
  }

  // 삭제 — 작성자는 지우기 전에 알아 둔다 (제재에 필요하다 · 글이 이미 없으면 신고 요약에 적힌 작성자를 쓴다)
  let authorUserId: string | null = null;
  let deleted = false;
  if (targetType === "post") {
    const post = await prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } });
    if (post) {
      authorUserId = post.userId;
      await prisma.post.delete({ where: { id: targetId } }); // 그 글의 댓글 · 좋아요는 함께 지워진다 (cascade)
      deleted = true;
    }
  } else {
    const comment = await prisma.comment.findUnique({ where: { id: targetId }, select: { userId: true, postId: true } });
    if (comment) {
      authorUserId = comment.userId;
      await prisma.comment.delete({ where: { id: targetId } });
      await prisma.post.updateMany({ where: { id: comment.postId }, data: { commentCount: await prisma.comment.count({ where: { postId: comment.postId } }) } });
      deleted = true;
    }
  }
  if (!deleted && !summarySnap.exists) throw apiError("이미 처리된 신고입니다.", 404);
  await closeReports(adminUid, targetType, targetId, "actioned", now);

  authorUserId ??= summaryUserId; // 글이 이미 없으면 신고 요약에 적힌 작성자를 쓴다
  let applied: AppliedSanction | null = null;
  if (sanction && authorUserId) applied = await applySanction(adminUid, authorUserId, sanction, { targetType, targetId }, now);
  await writeLog({ action: "delete", by: adminUid, targetType, targetId, userId: authorUserId, sanction: applied?.kind ?? null }, now);
  return { ok: true, deleted, sanction: applied };
}

/* ── 제재 ──────────────────────────────────────────────────── */

export interface AppliedSanction {
  kind: SanctionKind;
  strikes: number;
  /** 커뮤니티 정지가 끝나는 시각 (영구 · 해당 없음은 null) */
  until: string | null;
}

/** 계정 영구 정지 때 그 사람의 글 · 댓글 · 좋아요를 지우고 다른 글의 숫자를 맞춘다 */
async function purgeUserContent(userId: string): Promise<void> {
  const [comments, likes] = await Promise.all([
    prisma.comment.findMany({ where: { userId }, select: { postId: true } }),
    prisma.postLike.findMany({ where: { userId }, select: { postId: true } }),
  ]);
  await prisma.post.deleteMany({ where: { userId } }); // 그 글의 댓글 · 좋아요는 cascade
  await prisma.comment.deleteMany({ where: { userId } });
  await prisma.postLike.deleteMany({ where: { userId } });
  for (const postId of new Set(comments.map((c) => c.postId))) {
    await prisma.post.updateMany({ where: { id: postId }, data: { commentCount: await prisma.comment.count({ where: { postId } }) } });
  }
  for (const postId of new Set(likes.map((l) => l.postId))) {
    await prisma.post.updateMany({ where: { id: postId }, data: { likeCount: await prisma.postLike.count({ where: { postId } }) } });
  }
}

export async function applySanction(
  adminUid: string,
  userId: string,
  request: SanctionRequest,
  context: { targetType?: TargetType; targetId?: string } = {},
  now: number = Date.now(),
): Promise<AppliedSanction> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, uid: true, email: true, name: true } });
  if (!user) throw apiError("작성자 계정을 찾을 수 없습니다. (이미 탈퇴했을 수 있어요)", 404);
  const key = emailKey(user.email);
  if (!key) throw apiError("작성자의 이메일을 확인할 수 없습니다.", 500);

  const iso = new Date(now).toISOString();
  const prev = await readSanction(key);
  const doc: SanctionDoc = {
    emailKey: key,
    userId,
    strikes: (prev?.strikes ?? 0) + 1,
    community: prev?.community ?? null,
    banned: prev?.banned ?? false,
    bannedAt: prev?.bannedAt ?? null,
    updatedAt: iso,
  };
  const label = REASON_LABEL[request.reason];
  let until: string | null = null;
  let notice: { title: string; body: string } | null = null;

  if (request.kind === "warn") {
    notice = { title: "운영 정책 안내", body: `커뮤니티 이용 규칙(${label})에 어긋나는 글이 삭제됐어요. 반복되면 이용이 제한될 수 있어요.` };
  } else if (request.kind === "community") {
    until = request.days === null ? null : new Date(now + request.days * DAY).toISOString();
    doc.community = { until, reason: request.reason, at: iso };
    notice = {
      title: "커뮤니티 이용 정지",
      body: request.days === null ? `커뮤니티 이용 규칙(${label}) 위반으로 커뮤니티 이용이 정지됐어요.` : `커뮤니티 이용 규칙(${label}) 위반으로 ${request.days}일 동안 커뮤니티 이용이 정지됐어요.`,
    };
  } else {
    doc.banned = true;
    doc.bannedAt = iso;
  }

  // 기록을 먼저 남긴다 — 아래 Firebase 호출이 실패해도 이 사람은 이미 커뮤니티 · 가입이 막혀 있고 관리자가 다시 시도할 수 있다
  await getAdminFirestore().doc(`sanctions/${key}`).set(doc);

  if (request.kind === "ban") {
    const auth = getAdminAuth();
    await auth.updateUser(user.uid, { disabled: true }); // 새 로그인 불가
    await auth.revokeRefreshTokens(user.uid); // 새 ID 토큰 발급 불가 (이미 받은 토큰은 최대 1시간)
    await purgeUserContent(userId);
  } else if (notice) {
    await createNotification(user.uid, { type: "moderation", ...notice }).catch(() => {});
  }

  await writeLog({ action: request.kind, by: adminUid, userId, emailKey: key, reason: request.reason, days: request.kind === "community" ? request.days : null, ...context }, now);
  return { kind: request.kind, strikes: doc.strikes, until };
}

/* ── 제재 목록 · 해제 ──────────────────────────────────────── */

export interface ActiveSanction {
  emailKey: string;
  banned: boolean;
  /** 커뮤니티 정지 중이면 끝나는 시각(영구는 null) — 아니면 undefined */
  communityUntil: string | null | undefined;
  strikes: number;
  updatedAt: string;
  /** 계정이 남아 있으면 이름 · 이메일 (탈퇴했으면 null) */
  user: { id: string; name: string; email: string } | null;
}

export async function listActiveSanctions(now: number = Date.now()): Promise<ActiveSanction[]> {
  await purgeExpired(now);
  const snap = await getAdminFirestore().collection("sanctions").limit(500).get();
  const active = snap.docs.map((d) => d.data() as SanctionDoc).filter((s) => s.banned || communityActive(s, now));
  const ids = active.map((s) => s.userId).filter((x): x is string => Boolean(x));
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
  return active
    .map((s) => ({
      emailKey: s.emailKey,
      banned: s.banned,
      communityUntil: communityActive(s, now) ? (s.community!.until as string | null) : undefined,
      strikes: s.strikes,
      updatedAt: s.updatedAt,
      user: users.find((u) => u.id === s.userId) ?? null,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function liftSanction(adminUid: string, key: unknown, now: number = Date.now()): Promise<void> {
  if (typeof key !== "string" || !/^[0-9a-f]{64}$/.test(key)) throw apiError("제재 대상이 올바르지 않습니다.", 400);
  const doc = await readSanction(key);
  if (!doc || (!doc.banned && !communityActive(doc, now))) throw apiError("해제할 제재가 없습니다.", 404);
  const wasBanned = doc.banned;
  await getAdminFirestore()
    .doc(`sanctions/${key}`)
    .set({ ...doc, banned: false, community: null, updatedAt: new Date(now).toISOString() });
  if (wasBanned && doc.userId) {
    const user = await prisma.user.findUnique({ where: { id: doc.userId }, select: { uid: true } });
    if (user) await getAdminAuth().updateUser(user.uid, { disabled: false });
  }
  await writeLog({ action: "lift", by: adminUid, emailKey: key, userId: doc.userId }, now);
}

/** 정지가 끝났거나 해제된 지 `RETENTION_DAYS`가 지난 제재 기록 · 오래된 처리 기록을 지운다 (개인정보 처리방침의 보관 기간) */
export async function purgeExpired(now: number = Date.now()): Promise<number> {
  const db = getAdminFirestore();
  const cutoff = new Date(now - RETENTION_DAYS * DAY).toISOString();
  let removed = 0;
  const [sanctions, logs] = await Promise.all([db.collection("sanctions").limit(500).get(), db.collection("moderationLog").limit(500).get()]);
  for (const d of sanctions.docs) {
    const s = d.data() as SanctionDoc;
    if (!s.banned && !communityActive(s, now) && (s.updatedAt ?? "") < cutoff) {
      await d.ref.delete();
      removed++;
    }
  }
  for (const d of logs.docs) {
    if (((d.data() as { createdAt?: string }).createdAt ?? "") < cutoff) {
      await d.ref.delete();
      removed++;
    }
  }
  return removed;
}
