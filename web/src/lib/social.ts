import { verifyIdToken, apiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { assertCanWrite } from "@/lib/sanctions";

/* ── 소셜·커뮤니티 공용 유틸 (11단계) ──────────────────────────
   API Routes 전용. 클라이언트에서 import 금지 (firebase-admin 의존).
   ────────────────────────────────────────────────────────── */

export const MAX_POST_LENGTH = 1000;
export const MAX_COMMENT_LENGTH = 300;
export const FEED_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 20;

export const POST_TYPES = ["text", "badge"] as const;
export type PostType = (typeof POST_TYPES)[number];

/** 토큰 검증 + Supabase 유저 조회를 한 번에. { uid, userId, name } 반환. */
export async function requireUser(req: Request) {
  const uid = await verifyIdToken(req);
  const user = await prisma.user.findUnique({
    where: { uid },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw apiError("사용자를 찾을 수 없습니다.", 404);
  return { uid, userId: user.id, name: user.name, email: user.email };
}

/**
 * 글 · 댓글 · 좋아요처럼 **커뮤니티에 쓰는** 라우트용 — `requireUser` + 제재 확인 (M9).
 * 커뮤니티 이용 정지 · 계정 정지 중이면 403(한국어 안내 + 끝나는 날). 읽기 · 내 글 삭제 · 신고 · 차단은 정지 중에도 된다.
 */
export async function requireWriter(req: Request) {
  const user = await requireUser(req);
  await assertCanWrite(user.email);
  return user;
}

/** 본문 텍스트 검증 — 공백만 있는 값은 거부하고 trim한 문자열을 반환. */
export function requireText(value: unknown, max: number, label: string): string {
  if (typeof value !== "string") throw apiError(`${label}이(가) 필요합니다.`, 400);
  const trimmed = value.trim();
  if (trimmed.length === 0) throw apiError(`${label}을(를) 입력해주세요.`, 400);
  if (trimmed.length > max) throw apiError(`${label}은(는) 최대 ${max}자까지 가능합니다.`, 400);
  return trimmed;
}

/** cuid 형태의 경로 파라미터 검증. */
export function requireId(value: string | undefined, label: string): string {
  if (!value || value.length > 128) throw apiError(`유효하지 않은 ${label} ID입니다.`, 400);
  return value;
}

/** ?limit= 파싱 — 기본 FEED_PAGE_SIZE, 상한 MAX_PAGE_SIZE. */
export function parseLimit(url: URL): number {
  const raw = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) return FEED_PAGE_SIZE;
  return Math.min(Math.floor(raw), MAX_PAGE_SIZE);
}
