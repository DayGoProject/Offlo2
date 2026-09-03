import { auth } from "@/services/firebase";

/**
 * 커뮤니티 API 클라이언트 (11단계).
 * 컴포넌트는 fetch·토큰 처리를 직접 하지 않고 이 파일을 통해서만 호출한다.
 */

/* ── 타입 ──────────────────────────────────────────────────── */

export type PostType = "text" | "badge";

export interface FeedPost {
  id: string;
  type: PostType;
  content: string;
  badgeName: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  authorName: string;
  isMine: boolean;
  liked: boolean;
}

export interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  isMine: boolean;
}

export interface RankingEntry {
  rank: number;
  name: string;
  avgScore: number;
  analysisCount: number;
  isMe: boolean;
}

export const MAX_POST_LENGTH = 1000;
export const MAX_COMMENT_LENGTH = 300;

/* ── 공통 호출 유틸 ─────────────────────────────────────────── */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");

  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "요청을 처리하지 못했습니다.");
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

/* ── 피드 ──────────────────────────────────────────────────── */

export function fetchFeed(cursor?: string | null) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return request<{ posts: FeedPost[]; nextCursor: string | null }>(`/api/posts${qs}`);
}

export function createPost(content: string) {
  return request<{ post: { id: string } }>("/api/posts", json({ type: "text", content }));
}

/** 획득한 배지를 피드에 공유한다. 배지명은 서버가 DB에서 다시 확인한다. */
export function shareBadge(badgeId: string, content = "") {
  return request<{ post: { id: string } }>("/api/posts", json({ type: "badge", badgeId, content }));
}

export function deletePost(postId: string) {
  return request<{ ok: true }>(`/api/posts/${postId}`, { method: "DELETE" });
}

export function toggleLike(postId: string) {
  return request<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`, {
    method: "POST",
  });
}

/* ── 댓글 ──────────────────────────────────────────────────── */

export function fetchComments(postId: string) {
  return request<{ comments: FeedComment[] }>(`/api/posts/${postId}/comments`);
}

export function createComment(postId: string, content: string) {
  return request<{ comment: FeedComment }>(`/api/posts/${postId}/comments`, json({ content }));
}

export function deleteComment(commentId: string) {
  return request<{ ok: true }>(`/api/comments/${commentId}`, { method: "DELETE" });
}

/* ── 랭킹 ──────────────────────────────────────────────────── */

export function fetchRanking() {
  return request<{
    ranking: RankingEntry[];
    myRank: RankingEntry | null;
    minAnalyses: number;
  }>("/api/ranking");
}
