import { createHash } from "node:crypto";

import { apiError, getAdminFirestore } from "@/lib/firebase-admin";
import { kstDateKey } from "@/lib/kst";

/**
 * 사용자 제재 기록 (M9 — 관리자가 신고를 처리하며 내리는 경고 · 커뮤니티 이용 정지 · 계정 영구 정지).
 *
 * **저장은 Firestore 서버 전용 `sanctions/{이메일 해시}`다** (클라이언트는 읽지도 쓰지도 못한다 — `firestore.rules`의 "그 외 모든 접근 차단" · DB 스키마 변경 없음).
 * 문서 이름을 계정 id(uid)가 아니라 **이메일의 SHA-256 해시**로 쓴 이유: 회원 탈퇴는 `users/{uid}`를 통째로 지우고 같은 Google 계정으로 다시 가입하면 새 uid가 생긴다.
 * uid로 두면 탈퇴 → 재가입으로 정지를 피할 수 있다. 이메일(Google 계정)은 다시 가입해도 같다 — 그래서 정지 기록은 **탈퇴로 지워지지 않는다** (개인정보 처리방침 `/privacy`에 적혀 있다).
 *
 * 이 파일은 **Firestore만 쓴다** (Firebase Auth · Prisma는 `moderation-admin.ts`) — 커뮤니티 쓰기 라우트가 가볍게 import한다.
 */

export interface SanctionDoc {
  emailKey: string;
  /** 제재 당시의 DB 사용자 id (탈퇴하면 가리키는 사용자가 없다) */
  userId: string | null;
  /** 경고 · 정지를 받은 횟수 — 관리자가 처리할 때 이력으로 본다 */
  strikes: number;
  /** 커뮤니티 이용 정지 — `until`이 null이면 영구 */
  community: { until: string | null; reason: string; at: string } | null;
  /** 계정 영구 정지 (Firebase Auth 계정도 비활성화한다) */
  banned: boolean;
  bannedAt: string | null;
  updatedAt: string;
}

/** 이메일 → 문서 키. 형식이 아니면 null (제재 조회를 건너뛴다) */
export function emailKey(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return normalized.includes("@") ? createHash("sha256").update(normalized).digest("hex") : null;
}

export async function readSanction(key: string): Promise<SanctionDoc | null> {
  const snap = await getAdminFirestore().doc(`sanctions/${key}`).get();
  return snap.exists ? (snap.data() as SanctionDoc) : null;
}

/** 커뮤니티 정지가 지금도 이어지는가 (기간이 끝났으면 false — 문서는 이력으로 남긴다) */
export function communityActive(doc: SanctionDoc | null, now: number = Date.now()): boolean {
  if (!doc?.community) return false;
  return doc.community.until === null || Date.parse(doc.community.until) > now;
}

const CONTACT = "문의는 개인정보 처리방침에 적힌 이메일로 보내주세요.";

function kstLabel(iso: string): string {
  const [y, m, d] = kstDateKey(Date.parse(iso)).split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 지금 이용이 막혀 있으면 그 이유를 한국어로, 아니면 null */
export function suspensionMessage(doc: SanctionDoc | null, now: number = Date.now()): string | null {
  if (!doc) return null;
  if (doc.banned) return `이용이 정지된 계정입니다. ${CONTACT}`;
  if (!communityActive(doc, now)) return null;
  const until = doc.community!.until;
  return until
    ? `커뮤니티 이용이 정지된 계정입니다. (${kstLabel(until)}까지) ${CONTACT}`
    : `커뮤니티 이용이 정지된 계정입니다. ${CONTACT}`;
}

/** 글 · 댓글 · 좋아요 · 배지 자랑을 쓰기 직전에 부른다 — 커뮤니티 정지 · 계정 정지면 403 */
export async function assertCanWrite(email: unknown, now: number = Date.now()): Promise<void> {
  const key = emailKey(email);
  if (!key) return;
  const message = suspensionMessage(await readSanction(key), now);
  if (message) throw apiError(message, 403);
}

/** 가입(첫 로그인)에서 부른다 — 영구 정지된 이메일은 새 계정을 만들 수 없다 */
export async function assertNotBanned(email: unknown): Promise<void> {
  const key = emailKey(email);
  if (!key) return;
  const doc = await readSanction(key);
  if (doc?.banned) throw apiError(`이용이 정지된 계정입니다. ${CONTACT}`, 403);
}
