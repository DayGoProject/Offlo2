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
        <span className="text-[0.65rem] text-black/50 dark:text-white/50 font-medium">{label}</span>
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
    <section className="flex flex-col gap-0 border border-black/[0.08] dark:border-white/[0.08] rounded-2xl overflow-hidden">
      {/* 채팅 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3.5 bg-brand/[0.05] border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        <span className="text-sm font-semibold text-[#0A0A0F] dark:text-white">AI 코치와 대화하기</span>
        <span className="text-xs text-black/40 dark:text-white/40 ml-1">· 이미지 첨부 가능</span>
      </div>

      {/* 메시지 목록 */}
      <div className="flex flex-col gap-4 px-5 py-5 max-h-[480px] overflow-y-auto bg-black/[0.01] dark:bg-white/[0.01]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {/* 아바타 */}
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
              msg.role === "model"
                ? "bg-brand/20 text-brand"
                : "bg-black/[0.08] dark:bg-white/[0.1] text-black/60 dark:text-white/60"
            }`}>
              {msg.role === "model" ? "AI" : "나"}
            </div>

            <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {/* 이미지 프리뷰 */}
              {msg.imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={msg.imagePreview} alt="첨부 이미지" className="max-w-[200px] rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
              )}
              {/* 텍스트 버블 */}
              {(msg.text && msg.text !== "(이미지 첨부)") && (
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "model"
                    ? "bg-white/80 dark:bg-white/[0.06] border border-black/[0.07] dark:border-white/[0.07] text-[#0A0A0F] dark:text-white/90 rounded-tl-sm"
                    : "bg-brand/[0.12] border border-brand/20 text-[#0A0A0F] dark:text-white/90 rounded-tr-sm"
                }`}>
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 로딩 */}
        {sending && (
          <div className="flex gap-3 flex-row">
            <div className="w-7 h-7 rounded-full shrink-0 bg-brand/20 text-brand flex items-center justify-center text-xs font-bold">AI</div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/80 dark:bg-white/[0.06] border border-black/[0.07] dark:border-white/[0.07]">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 이미지 첨부 프리뷰 */}
      {pendingImage && (
        <div className="flex items-center gap-3 px-5 py-3 bg-brand/[0.03] border-t border-black/[0.06] dark:border-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage.preview} alt="첨부 예정" className="w-12 h-12 rounded-lg object-cover border border-black/[0.08] dark:border-white/[0.08]" />
          <span className="text-xs text-black/50 dark:text-white/50 flex-1 truncate">{pendingImage.file.name}</span>
          <button onClick={removePendingImage} className="text-black/40 dark:text-white/40 hover:text-red-500 transition-colors text-lg leading-none">×</button>
        </div>
      )}

      {/* 입력창 */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-black/20">
        {/* 이미지 첨부 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-black/40 dark:text-white/40 hover:text-brand hover:bg-brand/10 transition-all"
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
          className="flex-1 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-[#0A0A0F] dark:text-white outline-none focus:border-brand/60 transition-colors resize-none placeholder:text-black/35 dark:placeholder:text-white/35 min-h-[40px] max-h-[120px]"
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
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-brand text-[#0A0A0F] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
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
      <main className="min-h-screen pt-20">
        <div className="max-w-2xl mx-auto mt-28 px-6 flex flex-col items-center gap-5">
          <div className="w-11 h-11 rounded-full border-[3px] border-brand/20 border-t-brand animate-spin" />
          <p className="text-black/50 dark:text-white/50 text-sm">결과를 불러오는 중...</p>
        </div>
      </main>
    </>
  );

  if (error || !analysis) return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <div className="max-w-md mx-auto mt-28 px-6 flex flex-col items-center gap-5">
          <p className="text-red-500 text-sm text-center">{error ?? "알 수 없는 오류가 발생했습니다."}</p>
          <Link href="/analysis" className="bg-brand text-[#0A0A0F] rounded-full px-7 py-3 font-bold text-sm">다시 분석하기</Link>
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
      <main className="min-h-screen pt-20">
        <div className="max-w-2xl mx-auto px-6 py-12 pb-20 flex flex-col gap-8">

          {/* ── 상단 요약 ── */}
          <div className="flex items-center gap-8 bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-8 py-7 shadow-sm dark:shadow-none max-[560px]:flex-col max-[560px]:items-center max-[560px]:text-center max-[560px]:px-5 max-[560px]:py-6">
            <ScoreCircle score={analysis.detoxScore} />
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-[#0A0A0F] dark:text-white tracking-tight">분석 결과</h1>
                <span className="text-xs font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">{periodLabel}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-black/40 dark:text-white/40">총 스크린타임</span>
                <span className="text-2xl font-bold text-[#0A0A0F] dark:text-white">{formatMinutes(analysis.totalMinutes)}</span>
              </div>
              {analysis.topCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-[560px]:justify-center">
                  {analysis.topCategories.slice(0, 3).map((cat) => (
                    <span key={cat.category} className="bg-brand/[0.08] border border-brand/20 text-brand rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {cat.category} · {formatMinutes(cat.minutes)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 앱별 사용 시간 ── */}
          <section className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">앱별 사용 시간</h2>
            <div className="flex flex-col gap-4">
              {analysis.apps.map((app, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-black/85 dark:text-white/85">{app.appName}</span>
                    <span className="text-sm font-semibold text-brand">{formatMinutes(app.minutes)}</span>
                  </div>
                  <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand to-brand/50 rounded-full transition-all duration-500"
                      style={{ width: `${(app.minutes / maxMinutes) * 100}%` }} />
                  </div>
                  <span className="text-[0.72rem] text-black/30 dark:text-white/30">{app.category}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── 핵심 문제 3가지 ── */}
          {analysis.coreProblems && analysis.coreProblems.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">내 사용 패턴의 핵심 문제</h2>
              <div className="flex flex-col gap-3">
                {analysis.coreProblems.map((problem, i) => (
                  <div key={i} className="flex gap-4 bg-red-500/[0.04] border border-red-500/[0.12] rounded-2xl px-5 py-4">
                    <span className="w-7 h-7 min-w-7 rounded-full bg-red-500/[0.12] text-red-500 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-black/75 dark:text-white/75 leading-relaxed m-0">{problem}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 심리적 원인 ── */}
          {analysis.psychologicalCauses && analysis.psychologicalCauses.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">왜 이런 패턴이 생겼을까요?</h2>
              <div className="bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-5 shadow-sm dark:shadow-none flex flex-col gap-3">
                {analysis.psychologicalCauses.map((cause, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-brand mt-0.5">💡</span>
                    <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed m-0">{cause}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 디톡스 전략 5가지 ── */}
          {analysis.detoxStrategies && analysis.detoxStrategies.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">가장 효과적인 디톡스 전략</h2>
              <div className="flex flex-col gap-3">
                {analysis.detoxStrategies.map((strategy, i) => (
                  <div key={i} className="flex gap-4 bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 shadow-sm dark:shadow-none">
                    <span className="w-7 h-7 min-w-7 rounded-full bg-brand/[0.12] text-brand text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-black/75 dark:text-white/75 leading-relaxed m-0">{strategy}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 하루 루틴 ── */}
          {analysis.dailyRoutine && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">하루 실천 루틴</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: "🌅", label: "아침", content: analysis.dailyRoutine.morning },
                  { icon: "☀️", label: "낮", content: analysis.dailyRoutine.afternoon },
                  { icon: "🌙", label: "밤", content: analysis.dailyRoutine.evening },
                ].map(({ icon, label, content }) => (
                  <div key={label} className="bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-4 py-4 shadow-sm dark:shadow-none flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <span className="text-xs font-bold text-brand">{label}</span>
                    </div>
                    <p className="text-sm text-black/65 dark:text-white/65 leading-relaxed m-0">{content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 맞춤 디톡스 추천 (기존) ── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#0A0A0F] dark:text-white tracking-tight">맞춤 디톡스 추천</h2>
            <div className="flex flex-col gap-3">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 shadow-sm dark:shadow-none">
                  <span className="w-7 h-7 min-w-7 rounded-full bg-brand/[0.12] text-brand text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-sm text-black/75 dark:text-white/75 leading-relaxed m-0">{rec}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 프리미엄 CTA ── */}
          {!analysis.isPremium && (
            <div className="bg-brand/[0.05] border border-brand/[0.18] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-black/65 dark:text-white/65 leading-relaxed m-0">
                📊 <strong className="text-brand">프리미엄</strong>으로 업그레이드하면 카테고리별 차트, 주간 트렌드, 목표 설정 기능을 사용할 수 있습니다.
              </p>
              <button className="bg-brand text-[#0A0A0F] rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer border-none whitespace-nowrap hover:opacity-90 transition-opacity">
                프리미엄 시작하기
              </button>
            </div>
          )}

          {/* ── AI 채팅 ── */}
          <AnalysisChat analysisId={id} initialQuestion={initialChatQuestion} />

          {/* ── 액션 버튼 ── */}
          <div className="flex gap-3 max-[560px]:flex-col">
            <Link href="/analysis" className="bg-brand text-[#0A0A0F] rounded-full px-7 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity max-[560px]:text-center">
              새로운 분석하기
            </Link>
            <Link href="/dashboard" className="bg-transparent text-black/60 dark:text-white/60 border border-black/[0.12] dark:border-white/[0.12] rounded-full px-6 py-3.5 text-sm hover:text-black/90 dark:hover:text-white/90 hover:border-black/25 dark:hover:border-white/25 transition-all max-[560px]:text-center">
              대시보드 보기
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
