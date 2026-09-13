"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { relTime } from "@/lib/format";
import {
  fetchComments,
  createComment,
  deleteComment,
  deletePost,
  toggleLike,
  MAX_COMMENT_LENGTH,
  type FeedComment,
  type FeedPost,
} from "@/services/community";

/* ── 유틸 ──────────────────────────────────────────────────── */

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="num flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--score-track)",
        color: "var(--text-muted)",
        fontSize: size >= 32 ? 12 : 11,
        fontWeight: 600,
        letterSpacing: 0,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
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
  // window.confirm 대신 두 단계 확인 — 브라우저 모달은 다크 팔레트를 따르지 않고
  // 자동화·모바일에서 흐름을 끊는다
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    try {
      await deletePost(post.id);
      onDelete();
    } catch (e) {
      setConfirmDelete(false);
      setError(e instanceof Error ? e.message : "글을 삭제하지 못했습니다.");
    }
  }

  return (
    <article
      className="flex flex-col gap-3.5 w-full px-6 py-[22px] rounded-card"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${highlight ? "rgba(61,219,135,0.45)" : "var(--border-card)"}`,
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-[11px]">
        <Avatar name={post.authorName} />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <p className="text-[13px] leading-4 font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {post.authorName}
          </p>
          <p className="text-[11px] leading-[14px]" style={{ color: "var(--text-muted)" }}>
            {relTime(post.createdAt)}
          </p>
        </div>

        {/* 배지 자랑 글이면 배지 이름을 헤더 오른쪽 알약으로 */}
        {post.type === "badge" && post.badgeName && (
          <span
            className="flex items-center h-6 px-[11px] rounded-full text-[11px] leading-[14px] font-semibold shrink-0"
            style={{
              background: "var(--accent-soft)",
              border: "1px solid rgba(61,219,135,0.2)",
              color: "var(--color-bloom)",
            }}
          >
            {post.badgeName}
          </span>
        )}

        {post.isMine &&
          (confirmDelete ? (
            <span className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDeletePost}
                className="text-[11px] transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--danger)" }}
              >
                삭제할까요?
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                취소
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] shrink-0 transition-opacity hover:opacity-80 cursor-pointer"
              style={{ color: "var(--text-faint)" }}
            >
              삭제
            </button>
          ))}
      </div>

      {/* 본문 */}
      {post.content && (
        <p className="text-sm leading-[23px] whitespace-pre-wrap break-words" style={{ color: "var(--text-primary-soft)" }}>
          {post.content}
        </p>
      )}

      {/* 액션 */}
      <div className="flex items-center gap-[18px] pt-3" style={{ borderTop: "1px solid var(--border-card)" }}>
        <button
          onClick={handleLike}
          aria-pressed={post.liked}
          className="flex items-center gap-[7px] transition-opacity hover:opacity-75 cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path
              d="M8 13.6 3.2 9a2.9 2.9 0 0 1 4.1-4.1L8 5.6l.7-.7A2.9 2.9 0 0 1 12.8 9L8 13.6z"
              fill={post.liked ? "var(--color-bloom)" : "none"}
              stroke={post.liked ? "none" : "var(--text-muted)"}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="num text-xs leading-4"
            style={{ color: post.liked ? "var(--color-bloom)" : "var(--text-muted)", letterSpacing: 0 }}
          >
            {post.likeCount}
          </span>
        </button>

        <button
          onClick={handleToggleComments}
          aria-expanded={open}
          className="flex items-center gap-[7px] transition-opacity hover:opacity-75 cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path
              d="M2.4 7.4c0-2.6 2.5-4.6 5.6-4.6s5.6 2 5.6 4.6-2.5 4.6-5.6 4.6c-.7 0-1.4-.1-2-.3l-2.8 1.1.7-2.3a4.3 4.3 0 0 1-1.5-3.1z"
              fill="none"
              stroke={open ? "var(--text-primary)" : "var(--text-muted)"}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="num text-xs leading-4"
            style={{ color: open ? "var(--text-primary)" : "var(--text-muted)", letterSpacing: 0 }}
          >
            {post.commentCount}
          </span>
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
            <div className="flex flex-col gap-3.5 pt-3.5" style={{ borderTop: "1px solid var(--border-card)" }}>
              {comments === null ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  댓글 불러오는 중…
                </p>
              ) : comments.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  아직 댓글이 없어요. 첫 응원을 남겨보세요.
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar name={c.authorName} size={26} />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          {c.authorName}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
                          {relTime(c.createdAt)}
                        </span>
                        {c.isMine && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-[11px] ml-auto shrink-0 transition-opacity hover:opacity-80 cursor-pointer"
                            style={{ color: "var(--text-ghost)" }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      <p
                        className="text-xs leading-[19px] whitespace-pre-wrap break-words"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* 댓글 입력 */}
              <div
                className="flex items-center gap-2.5 w-full py-1.5 pl-4 pr-1.5 rounded-full"
                style={{ background: "var(--bg-nav)", border: "1px solid var(--border-card)" }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddComment();
                  }}
                  maxLength={MAX_COMMENT_LENGTH}
                  placeholder="따뜻한 댓글을 남겨주세요"
                  className="flex-1 min-w-0 bg-transparent py-1.5 text-xs outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={busy || draft.trim().length === 0}
                  className="flex items-center h-7 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-opacity hover:opacity-85 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: "var(--color-bloom)", color: "var(--bg-page)" }}
                >
                  등록
                </button>
              </div>

              {error && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
