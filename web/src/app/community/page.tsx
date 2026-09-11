"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import { ErrorNote } from "@/components/app/Field";
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
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const rankingRef = useRef<HTMLDivElement>(null);

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

  const myInitial = (user.displayName ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <AppShell>
      <PageHeader
        eyebrow={loading ? "불러오는 중" : `글 ${posts.length}개${cursor ? "+" : ""}`}
        title="커뮤니티"
        actions={
          <>
            <Pill onClick={() => rankingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              주간 랭킹
            </Pill>
            <Pill onClick={() => composerRef.current?.focus()} variant="primary">
              글 쓰기
            </Pill>
          </>
        }
      />

      <div className="flex flex-col lg:flex-row gap-3.5 w-full items-start">
        {/* ── 좌: 피드 ── */}
        <div className="flex flex-col gap-3.5 w-full lg:flex-1 min-w-0">
          {/* 이름 공개 안내 */}
          {showNotice && (
            <div
              className="flex items-start gap-3.5 w-full px-[22px] py-4 rounded-card"
              style={{ background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.18)" }}
            >
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <p className="text-[13px] leading-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                  커뮤니티에는 설정에 저장된 이름이 공개돼요
                </p>
                <p className="text-xs leading-[19px]" style={{ color: "var(--text-muted)" }}>
                  글·댓글·랭킹에 이름이 그대로 표시됩니다. 실명이 부담된다면 설정에서 이름을 바꿔주세요.
                </p>
              </div>
              <button
                onClick={dismissNotice}
                className="text-xs shrink-0 transition-opacity hover:opacity-75 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                확인
              </button>
            </div>
          )}

          {/* 글쓰기 */}
          <div
            className="flex flex-col gap-3.5 w-full px-6 py-[22px] rounded-card"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
          >
            <div className="flex items-start gap-[11px] w-full">
              <span
                className="num flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                style={{ background: "var(--accent-soft)", color: "var(--color-bloom)", fontSize: 13, fontWeight: 600, letterSpacing: 0 }}
              >
                {myInitial}
              </span>
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_POST_LENGTH}
                rows={2}
                placeholder="오늘의 디톡스는 어땠나요? 팁이나 응원을 남겨주세요."
                className="flex-1 min-w-0 bg-transparent py-2 text-sm leading-[23px] outline-none resize-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pl-[47px]">
              <span className="num text-xs" style={{ color: "var(--text-ghost)", letterSpacing: 0 }}>
                {draft.length} / {MAX_POST_LENGTH}
              </span>
              <button
                onClick={handlePost}
                disabled={posting || draft.trim().length === 0}
                className="flex items-center h-9 px-[18px] rounded-full text-[13px] font-semibold shrink-0 transition-opacity hover:opacity-85 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "var(--color-bloom)", color: "var(--bg-page)" }}
              >
                {posting ? "등록 중…" : "글 올리기"}
              </button>
            </div>

            {postError && <ErrorNote>{postError}</ErrorNote>}
          </div>

          {/* 피드 */}
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[157px] w-full rounded-card animate-pulse" style={{ background: "var(--bg-bar)" }} />
              ))}
            </>
          ) : error ? (
            <ErrorNote>{error}</ErrorNote>
          ) : posts.length === 0 ? (
            <div
              className="flex flex-col gap-1.5 w-full px-6 py-10 rounded-card"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
            >
              <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>
                아직 글이 없어요
              </p>
              <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-muted)" }}>
                첫 글을 남겨 커뮤니티를 시작해 보세요. 획득한 배지는 배지 페이지에서 바로 자랑할 수 있어요.
              </p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <div key={post.id} ref={post.id === highlightId ? highlightRef : undefined} className="w-full">
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
                  className="w-full h-11 rounded-full text-[13px] font-medium transition-opacity hover:opacity-75 disabled:opacity-50 cursor-pointer"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
                >
                  {loadingMore ? "불러오는 중…" : "더 보기"}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── 우: 랭킹 ── */}
        <div ref={rankingRef} className="w-full lg:w-[330px] shrink-0 lg:sticky lg:top-[30px]">
          <RankingWidget />
        </div>
      </div>
    </AppShell>
  );
}
