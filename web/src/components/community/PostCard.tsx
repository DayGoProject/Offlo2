"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getBadgeEmoji } from "@/lib/badge-utils";
import { relTime } from "@/lib/format";
import {
  fetchComments, createComment, deleteComment, deletePost, toggleLike,
  MAX_COMMENT_LENGTH, type FeedComment, type FeedPost,
} from "@/services/community";

/* ── 유틸 ──────────────────────────────────────────────────── */

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{ background: "rgba(61,219,135,0.12)", color: "#3DDB87" }}
    >
      {name.trim().charAt(0) || "?"}
    </div>
  );
}

/* ── 아이콘 ────────────────────────────────────────────────── */

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

/* ── 게시글 카드 ───────────────────────────────────────────── */

export default function PostCard({
  post,
  onUpdate,
  onDelete,
  highlight = false,
}: {
  post: FeedPost;
  onUpdate: (patch: Partial<FeedPost>) => void;
  onDelete: () => void;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLike() {
    // 낙관적 업데이트 후 서버 응답으로 실제 값을 덮어쓴다
    const before = { liked: post.liked, likeCount: post.likeCount };
    onUpdate({ liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) });
    try {
      const res = await toggleLike(post.id);
      onUpdate({ liked: res.liked, likeCount: res.likeCount });
    } catch {
      onUpdate(before);
    }
  }

  async function handleToggleComments() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try {
        setComments((await fetchComments(post.id)).comments);
      } catch (e) {
        setError(e instanceof Error ? e.message : "댓글을 불러오지 못했습니다.");
        setComments([]);
      }
    }
  }

  async function handleAddComment() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    try {
      const { comment } = await createComment(post.id, text);
      setComments((prev) => [...(prev ?? []), comment]);
      onUpdate({ commentCount: post.commentCount + 1 });
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "댓글을 등록하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteComment(id: string) {
    try {
      await deleteComment(id);
      setComments((prev) => (prev ?? []).filter((c) => c.id !== id));
      onUpdate({ commentCount: Math.max(0, post.commentCount - 1) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "댓글을 삭제하지 못했습니다.");
    }
  }

  async function handleDeletePost() {
    if (!confirm("이 글을 삭제할까요? 댓글도 함께 사라집니다.")) return;
    try {
      await deletePost(post.id);
      onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "글을 삭제하지 못했습니다.");
    }
  }

  return (
    <article
      className="rounded-2xl p-5"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${highlight ? "rgba(61,219,135,0.45)" : "var(--border-card)"}`,
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Avatar name={post.authorName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {post.authorName}
          </p>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            {relTime(post.createdAt)}
          </p>
        </div>
        {post.isMine && (
          <button
            onClick={handleDeletePost}
            className="text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-100"
            style={{ color: "var(--text-faint)", opacity: 0.7 }}
          >
            삭제
          </button>
        )}
      </div>

      {/* 배지 자랑 */}
      {post.type === "badge" && post.badgeName && (
        <div
          className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(61,219,135,0.08)", border: "1px solid rgba(61,219,135,0.2)" }}
        >
          <span className="text-2xl">{getBadgeEmoji(post.badgeName)}</span>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>배지 획득</p>
            <p className="text-sm font-bold" style={{ color: "#3DDB87" }}>{post.badgeName}</p>
          </div>
        </div>
      )}

      {/* 본문 */}
      {post.content && (
        <p
          className="mt-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={{ color: "var(--text-primary-soft)" }}
        >
          {post.content}
        </p>
      )}

      {/* 액션 */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            color: post.liked ? "#3DDB87" : "var(--text-muted)",
            background: post.liked ? "rgba(61,219,135,0.10)" : "var(--bg-subtle)",
            border: `1px solid ${post.liked ? "rgba(61,219,135,0.25)" : "var(--border-card)"}`,
          }}
        >
          <HeartIcon filled={post.liked} />
          {post.likeCount}
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            color: open ? "var(--text-primary)" : "var(--text-muted)",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-card)",
          }}
        >
          <CommentIcon />
          {post.commentCount}
        </button>
      </div>

      {/* 댓글 */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--border-strip)" }}>
              {comments === null ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>댓글 불러오는 중…</p>
              ) : comments.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  아직 댓글이 없어요. 첫 응원을 남겨보세요.
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar name={c.authorName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                          {c.authorName}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-ghost)" }}>
                          {relTime(c.createdAt)}
                        </span>
                        {c.isMine && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-xs ml-auto"
                            style={{ color: "var(--text-ghost)" }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      <p
                        className="text-xs mt-0.5 leading-relaxed whitespace-pre-wrap break-words"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* 댓글 입력 */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddComment();
                  }}
                  maxLength={MAX_COMMENT_LENGTH}
                  placeholder="따뜻한 댓글을 남겨주세요"
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-xs outline-none"
                  style={{
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-card)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={busy || draft.trim().length === 0}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{ background: "#3DDB87", color: "#0A0A0F" }}
                >
                  등록
                </button>
              </div>

              {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
