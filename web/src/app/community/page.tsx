"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import PostCard from "@/components/community/PostCard";
import RankingWidget from "@/components/community/RankingWidget";
import { createPost, fetchFeed, MAX_POST_LENGTH, type FeedPost } from "@/services/community";

const NOTICE_KEY = "offlo_community_notice_dismissed";

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const [showNotice, setShowNotice] = useState(false);
  // 알림 링크(/community?post=xxx)로 들어온 경우 해당 글을 강조한다
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    setShowNotice(localStorage.getItem(NOTICE_KEY) !== "1");
    const param = new URLSearchParams(window.location.search).get("post");
    if (param) setHighlightId(param);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetchFeed();
      setPosts(res.posts);
      setCursor(res.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "피드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, posts]);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchFeed(cursor);
      setPosts((prev) => [...prev, ...res.posts]);
      setCursor(res.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "더 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handlePost() {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setPostError("");
    try {
      await createPost(text);
      setDraft("");
      // 새 글이 맨 위에 오도록 첫 페이지를 다시 불러온다
      await load();
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "글을 등록하지 못했습니다.");
    } finally {
      setPosting(false);
    }
  }

  function updatePost(id: string, patch: Partial<FeedPost>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  function dismissNotice() {
    localStorage.setItem(NOTICE_KEY, "1");
    setShowNotice(false);
  }

  if (authLoading || !user) return null;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="ml-56 flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-7 py-5 border-b"
          style={{ borderColor: "var(--border-card)" }}
        >
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              커뮤니티
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              디톡스 경험과 팁을 나눠보세요
            </p>
          </div>
        </div>

        <div className="p-6 flex-1 flex gap-6 items-start">
          {/* ── 좌: 피드 ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* 이름 공개 안내 */}
            {showNotice && (
              <div
                className="rounded-2xl px-5 py-4 flex items-start gap-3"
                style={{ background: "rgba(61,219,135,0.06)", border: "1px solid rgba(61,219,135,0.2)" }}
              >
                <span className="text-lg leading-none mt-0.5">👋</span>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    커뮤니티에는 설정에 저장된 이름이 공개돼요
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    글·댓글·랭킹에 이름이 그대로 표시됩니다. 실명이 부담된다면 설정 페이지에서 이름을 바꿔주세요.
                  </p>
                </div>
                <button
                  onClick={dismissNotice}
                  className="text-xs px-2 py-1 rounded-full shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  확인
                </button>
              </div>
            )}

            {/* 글쓰기 */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_POST_LENGTH}
                rows={3}
                placeholder="오늘의 디톡스는 어땠나요? 팁이나 응원을 남겨주세요."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-card)",
                  color: "var(--text-primary)",
                }}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-ghost)" }}>
                  {draft.length} / {MAX_POST_LENGTH}
                </span>
                <button
                  onClick={handlePost}
                  disabled={posting || draft.trim().length === 0}
                  className="px-5 py-2.5 rounded-full text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{ background: "#3DDB87", color: "#0A0A0F" }}
                >
                  {posting ? "등록 중…" : "글 올리기"}
                </button>
              </div>
              {postError && (
                <p className="mt-2 text-xs" style={{ color: "#f87171" }}>{postError}</p>
              )}
            </div>

            {/* 피드 */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: "var(--bg-bar)" }} />
                ))}
              </div>
            ) : error ? (
              <div
                className="rounded-2xl p-6 text-center text-sm"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "#f87171" }}
              >
                {error}
              </div>
            ) : posts.length === 0 ? (
              <div
                className="rounded-2xl flex flex-col items-center justify-center py-14 gap-3"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
              >
                <span className="text-5xl">💬</span>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  아직 글이 없어요
                </p>
                <p className="text-sm text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  첫 글을 남겨 커뮤니티를 시작해보세요.
                  <br />
                  획득한 배지는 배지 페이지에서 바로 자랑할 수 있어요.
                </p>
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <div key={post.id} ref={post.id === highlightId ? highlightRef : undefined}>
                    <PostCard
                      post={post}
                      highlight={post.id === highlightId}
                      onUpdate={(patch) => updatePost(post.id, patch)}
                      onDelete={() => removePost(post.id)}
                    />
                  </div>
                ))}

                {cursor && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-card)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {loadingMore ? "불러오는 중…" : "더 보기"}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── 우: 랭킹 ── */}
          <div className="w-72 shrink-0 sticky top-6">
            <RankingWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
