"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/services/firebase";
import Navbar from "@/components/Navbar";

/* ── 타입 ── */
interface AppUsage { appName: string; minutes: number; category: string; }
interface TimePattern { timeSlot: string; apps: string[]; question: string; }
interface DailyRoutine { morning: string; afternoon: string; evening: string; }

interface Analysis {
  totalMinutes: number;
  periodType?: "daily" | "weekly";
  apps: AppUsage[];
  topCategories: { category: string; minutes: number }[];
  recommendations: string[];
  detoxScore: number;
  isPremium: boolean;
  createdAt: { seconds: number } | null;
  // 상세 분석 필드 (선택적 — 이전 분석과 호환)
  coreProblems?: string[];
  psychologicalCauses?: string[];
  detoxStrategies?: string[];
  dailyRoutine?: DailyRoutine;
  timePatterns?: TimePattern[];
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  imagePath?: string;
  imagePreview?: string;  // 로컬 프리뷰용 (UI only)
}

/* ── 유틸 ── */
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/* ── 스코어 원형 ── */
function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "#3DDB87" : score >= 40 ? "#f0b429" : "#ff6b6b";
  const label = score >= 70 ? "건강한 사용" : score >= 40 ? "주의 필요" : "디톡스 필요";
  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--score-track)" strokeWidth="7" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`}
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-[1.8rem] font-extrabold leading-none" style={{ color }}>{score}</span>
        <span className="text-[0.65rem] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>
    </div>
  );
}

/* ── 채팅 컴포넌트 ── */
function AnalysisChat({ analysisId, initialQuestion }: { analysisId: string; initialQuestion?: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialQuestion
      ? [{ role: "model", text: initialQuestion }]
      : [{ role: "model", text: "분석 결과에 대해 더 자세히 이야기 나눠볼까요? 궁금한 점이나 사용 패턴에 대해 말씀해 주세요. 이미지도 첨부하실 수 있어요." }]
  );
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("이미지는 10MB 이하만 첨부할 수 있습니다.");
      return;
    }
    setPendingImage({ file, preview: URL.createObjectURL(file) });
    e.target.value = "";
  }

  function removePendingImage() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
  }

  async function handleSend() {
    if ((!input.trim() && !pendingImage) || sending || !user) return;

    let imagePath: string | undefined;
    let imagePreview: string | undefined;

    // 이미지가 있으면 Storage에 업로드
    if (pendingImage) {
      try {
        const timestamp = Date.now();
        const ext = pendingImage.file.name.split(".").pop() || "jpg";
        imagePath = `users/${user.uid}/chat-images/${timestamp}.${ext}`;
        const fileRef = storageRef(storage, imagePath);
        await uploadBytes(fileRef, pendingImage.file, { contentType: pendingImage.file.type });
        imagePreview = pendingImage.preview;
      } catch {
        alert("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
        return;
      }
    }

    const userMessage: ChatMessage = {
      role: "user",
      text: input.trim() || "(이미지 첨부)",
      ...(imagePath && { imagePath }),
      ...(imagePreview && { imagePreview }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setPendingImage(null);
    setSending(true);

    try {
      const functions = getFunctions(getApp(), "asia-northeast3");
      const chatFn = httpsCallable<
        { analysisId: string; messages: Omit<ChatMessage, "imagePreview">[] },
        { reply: string }
      >(functions, "chatWithAnalysis");

      // imagePreview는 UI 전용이므로 서버에 보내지 않음
      const payload = updatedMessages.map(({ imagePreview: _preview, ...rest }) => rest);
      const result = await chatFn({ analysisId, messages: payload });

      setMessages((prev) => [...prev, { role: "model", text: result.data.reply }]);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "오류가 발생했습니다. 다시 시도해주세요.";
      setMessages((prev) => [...prev, { role: "model", text: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-col gap-0 rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border-card)" }}>
      {/* 채팅 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3.5"
        style={{ background: "rgba(61,219,135,0.05)", borderBottom: "1px solid var(--bg-bar)" }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#3DDB87" }} />
        <span className="text-sm font-semibold text-[var(--text-primary)]">AI 코치와 대화하기</span>
        <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>· 이미지 첨부 가능</span>
      </div>

      {/* 메시지 목록 */}
      <div className="flex flex-col gap-4 px-5 py-5 max-h-[600px] overflow-y-auto"
        style={{ background: "var(--bg-strip)" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {/* 아바타 */}
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
              style={{
                background: msg.role === "model" ? "rgba(61,219,135,0.2)" : "var(--border-card)",
                color: msg.role === "model" ? "#3DDB87" : "var(--text-secondary)",
              }}>
              {msg.role === "model" ? "AI" : "나"}
            </div>

            <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {/* 이미지 프리뷰 */}
              {msg.imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={msg.imagePreview} alt="첨부 이미지" className="max-w-[200px] rounded-xl"
                  style={{ border: "1px solid var(--border-card)" }} />
              )}
              {/* 텍스트 버블 */}
              {(msg.text && msg.text !== "(이미지 첨부)") && (
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-primary-soft)]"
                  style={msg.role === "model"
                    ? { background: "var(--bg-bar)", border: "1px solid var(--border-card)", borderRadius: "0 1rem 1rem 1rem" }
                    : { background: "rgba(61,219,135,0.12)", border: "1px solid rgba(61,219,135,0.2)", borderRadius: "1rem 0 1rem 1rem" }
                  }>
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 로딩 */}
        {sending && (
          <div className="flex gap-3 flex-row">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(61,219,135,0.2)", color: "#3DDB87" }}>AI</div>
            <div className="px-4 py-3 rounded-2xl"
              style={{ background: "var(--bg-bar)", border: "1px solid var(--border-card)" }}>
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]"
                  style={{ background: "var(--text-faint)" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]"
                  style={{ background: "var(--text-faint)" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]"
                  style={{ background: "var(--text-faint)" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 이미지 첨부 프리뷰 */}
      {pendingImage && (
        <div className="flex items-center gap-3 px-5 py-3"
          style={{ background: "rgba(61,219,135,0.03)", borderTop: "1px solid var(--bg-bar)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage.preview} alt="첨부 예정" className="w-12 h-12 rounded-lg object-cover"
            style={{ border: "1px solid var(--border-card)" }} />
          <span className="text-xs flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{pendingImage.file.name}</span>
          <button onClick={removePendingImage} className="text-lg leading-none hover:text-red-400 transition-colors"
            style={{ color: "var(--text-muted)" }}>×</button>
        </div>
      )}

      {/* 입력창 */}
      <div className="flex items-end gap-2 px-4 py-3"
        style={{ borderTop: "1px solid var(--bg-bar)", background: "var(--bg-subtle)" }}>
        {/* 이미지 첨부 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-all hover:bg-[rgba(61,219,135,0.1)]"
          style={{ color: "var(--text-muted)" }}
          title="이미지 첨부"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        {/* 텍스트 입력 */}
        <textarea
          className="flex-1 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none resize-none min-h-[40px] max-h-[120px]"
          style={{
            background: "var(--bg-bar)",
            border: "1px solid var(--border-card)",
          }}
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          rows={1}
        />

        {/* 전송 버튼 */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !pendingImage) || sending}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "#3DDB87", color: "#0A0A0F" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </section>
  );
}

/* ── 메인 결과 페이지 ── */
export default function ResultPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    async function fetchAnalysis() {
      try {
        const docRef = doc(db, "users", user!.uid, "analyses", id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError("분석 결과를 찾을 수 없습니다.");
        } else {
          setAnalysis(snap.data() as Analysis);
        }
      } catch {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setFetching(false);
      }
    }
    fetchAnalysis();
  }, [user, id]);

  if (loading || !user) return null;

  if (fetching) return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20" style={{ background: "var(--bg-page)" }}>
        <div className="max-w-2xl mx-auto mt-28 px-6 flex flex-col items-center gap-5">
          <div className="w-11 h-11 rounded-full border-[3px] animate-spin"
            style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>결과를 불러오는 중...</p>
        </div>
      </main>
    </>
  );

  if (error || !analysis) return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20" style={{ background: "var(--bg-page)" }}>
        <div className="max-w-md mx-auto mt-28 px-6 flex flex-col items-center gap-5">
          <p className="text-red-400 text-sm text-center">{error ?? "알 수 없는 오류가 발생했습니다."}</p>
          <Link href="/analysis" className="rounded-full px-7 py-3 font-bold text-sm"
            style={{ background: "#3DDB87", color: "#0A0A0F" }}>다시 분석하기</Link>
        </div>
      </main>
    </>
  );

  const maxMinutes = Math.max(...analysis.apps.map((a) => a.minutes), 1);
  const periodLabel = analysis.periodType === "weekly" ? "주간" : "일간";

  // 채팅 초기 질문: timePatterns[0]의 question 사용
  const initialChatQuestion = analysis.timePatterns?.[0]?.question;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20" style={{ background: "var(--bg-page)" }}>
        {/* background glow */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 30% 35%, rgba(61,219,135,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-20 py-12 pb-20">

          {/* ── 페이지 헤더 ── */}
          <div className="flex items-center gap-3 mb-10">
            <Link href="/analysis" className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-muted)" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 4l-4 4 4 4" />
              </svg>
              분석 페이지
            </Link>
            <span style={{ color: "var(--text-ghost)" }}>/</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>결과</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full ml-1"
              style={{ background: "rgba(61,219,135,0.12)", border: "1px solid rgba(61,219,135,0.2)", color: "#3DDB87" }}>
              {periodLabel}
            </span>
          </div>

          {/* ── 2-column grid ── */}
          <div className="grid gap-8 lg:gap-12" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

            {/* ── LEFT: 점수 + 앱 사용 + 액션 ── */}
            <div className="flex flex-col gap-6">

              {/* 점수 카드 */}
              <div className="rounded-2xl p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                <div className="flex items-center gap-6 mb-5">
                  <ScoreCircle score={analysis.detoxScore} />
                  <div className="flex flex-col gap-2">
                    <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">분석 결과</h1>
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>총 스크린타임</span>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{formatMinutes(analysis.totalMinutes)}</p>
                    </div>
                  </div>
                </div>
                {analysis.topCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.topCategories.slice(0, 3).map((cat) => (
                      <span key={cat.category} className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: "rgba(61,219,135,0.08)", border: "1px solid rgba(61,219,135,0.2)", color: "#3DDB87" }}>
                        {cat.category} · {formatMinutes(cat.minutes)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 앱별 사용 시간 */}
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">앱별 사용 시간</h2>
                <div className="flex flex-col gap-4">
                  {analysis.apps.map((app, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary-soft)" }}>{app.appName}</span>
                        <span className="text-sm font-semibold" style={{ color: "#3DDB87" }}>{formatMinutes(app.minutes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(app.minutes / maxMinutes) * 100}%`, background: "linear-gradient(to right, #3DDB87, rgba(61,219,135,0.5))" }} />
                      </div>
                      <span className="text-[0.72rem]" style={{ color: "var(--text-faint)" }}>{app.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 프리미엄 CTA */}
              {!analysis.isPremium && (
                <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
                  style={{ background: "rgba(61,219,135,0.05)", border: "1px solid rgba(61,219,135,0.18)" }}>
                  <p className="text-xs leading-relaxed m-0" style={{ color: "var(--text-secondary)" }}>
                    📊 <strong style={{ color: "#3DDB87" }}>프리미엄</strong>으로 업그레이드하면 차트, 주간 트렌드, 목표 설정을 사용할 수 있어요.
                  </p>
                  <button className="rounded-full px-4 py-2 text-xs font-bold cursor-pointer border-none whitespace-nowrap hover:opacity-90 transition-opacity"
                    style={{ background: "#3DDB87", color: "#0A0A0F" }}>
                    프리미엄 시작하기
                  </button>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3 flex-wrap">
                <Link href="/analysis" className="rounded-full px-6 py-3 text-sm font-bold hover:opacity-90 transition-opacity text-center"
                  style={{ background: "#3DDB87", color: "#0A0A0F" }}>
                  새로운 분석하기
                </Link>
                <Link href="/dashboard" className="rounded-full px-5 py-3 text-sm transition-all text-center"
                  style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-medium)" }}>
                  대시보드 보기
                </Link>
              </div>

              {/* AI 채팅 */}
              <AnalysisChat analysisId={id} initialQuestion={initialChatQuestion} />
            </div>

            {/* ── RIGHT: 인사이트 ── */}
            <div className="flex flex-col gap-6">

              {/* 핵심 문제 */}
              {analysis.coreProblems && analysis.coreProblems.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">내 사용 패턴의 핵심 문제</h2>
                  <div className="flex flex-col gap-2.5">
                    {analysis.coreProblems.map((problem, i) => (
                      <div key={i} className="flex gap-4 rounded-2xl px-5 py-4"
                        style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                        <span className="w-7 h-7 min-w-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed m-0" style={{ color: "var(--text-primary-soft)" }}>{problem}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 심리적 원인 */}
              {analysis.psychologicalCauses && analysis.psychologicalCauses.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">왜 이런 패턴이 생겼을까요?</h2>
                  <div className="rounded-2xl px-5 py-5 flex flex-col gap-3"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                    {analysis.psychologicalCauses.map((cause, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="mt-0.5" style={{ color: "#3DDB87" }}>💡</span>
                        <p className="text-sm leading-relaxed m-0" style={{ color: "var(--text-primary-soft)" }}>{cause}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 디톡스 전략 */}
              {analysis.detoxStrategies && analysis.detoxStrategies.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">가장 효과적인 디톡스 전략</h2>
                  <div className="flex flex-col gap-2.5">
                    {analysis.detoxStrategies.map((strategy, i) => (
                      <div key={i} className="flex gap-4 rounded-2xl px-5 py-4"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                        <span className="w-7 h-7 min-w-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ background: "rgba(61,219,135,0.12)", color: "#3DDB87" }}>
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed m-0" style={{ color: "var(--text-primary-soft)" }}>{strategy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 하루 루틴 */}
              {analysis.dailyRoutine && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">하루 실천 루틴</h2>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { icon: "🌅", label: "아침", content: analysis.dailyRoutine.morning },
                      { icon: "☀️", label: "낮", content: analysis.dailyRoutine.afternoon },
                      { icon: "🌙", label: "밤", content: analysis.dailyRoutine.evening },
                    ].map(({ icon, label, content }) => (
                      <div key={label} className="rounded-2xl px-4 py-4 flex flex-col gap-2"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <span className="text-xs font-bold" style={{ color: "#3DDB87" }}>{label}</span>
                        </div>
                        <p className="text-sm leading-relaxed m-0" style={{ color: "var(--text-secondary)" }}>{content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 맞춤 디톡스 추천 */}
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">맞춤 디톡스 추천</h2>
                <div className="flex flex-col gap-2.5">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-4 rounded-2xl px-5 py-4"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                      <span className="w-7 h-7 min-w-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ background: "rgba(61,219,135,0.12)", color: "#3DDB87" }}>{i + 1}</span>
                      <p className="text-sm leading-relaxed m-0" style={{ color: "var(--text-primary-soft)" }}>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
