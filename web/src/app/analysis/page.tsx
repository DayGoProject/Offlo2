"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { storage, db } from "@/services/firebase";
import Navbar from "@/components/Navbar";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];
const MAX_SIZE_MB = 10;
const WEEKLY_THRESHOLD = 7; // 주간 분석에 필요한 일간 분석 수

/** 현재 달력 주의 시작(이번 주 월요일 00:00:00)을 반환 */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=일, 1=월 … 6=토
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** 두 Date가 같은 날(로컬 기준)인지 확인 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DailyRecord {
  id: string;
  detoxScore: number;
  totalMinutes: number;
  createdAt: Date;
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 업로드 상태
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 주간 분석 상태
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [hasUploadedToday, setHasUploadedToday] = useState(false);
  const [weeklyStatus, setWeeklyStatus] = useState<"idle" | "generating">("idle");
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // 일간 분석 기록 로드
  useEffect(() => {
    if (!user) return;
    async function loadRecords() {
      try {
        const weekStart = Timestamp.fromDate(getWeekStart());
        const q = query(
          collection(db, "users", user!.uid, "analyses"),
          where("periodType", "==", "daily"),
          where("createdAt", ">=", weekStart),
          orderBy("createdAt", "desc"),
          limit(WEEKLY_THRESHOLD)
        );
        const snap = await getDocs(q);
        const records: DailyRecord[] = snap.docs.map((doc) => {
          const data = doc.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: doc.id,
            detoxScore: data.detoxScore as number ?? 0,
            totalMinutes: data.totalMinutes as number ?? 0,
            createdAt: ts ? ts.toDate() : new Date(),
          };
        });
        setDailyRecords(records);
        // 가장 최근 기록이 오늘이면 오늘 업로드 완료로 표시
        if (records.length > 0 && isSameDay(records[0].createdAt, new Date())) {
          setHasUploadedToday(true);
        }
      } catch {
        // 인덱스 미생성 등의 오류는 무시 (기능 저하 허용)
      } finally {
        setRecordsLoading(false);
      }
    }
    loadRecords();
  }, [user]);

  function handleFile(selected: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("JPG, PNG, HEIC, WEBP 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }

  async function handleAnalyze() {
    if (!file || !user) return;
    setError(null);
    try {
      setStatus("uploading");
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `users/${user.uid}/screenshots/${timestamp}.${ext}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file, { contentType: file.type });

      setStatus("analyzing");
      const functions = getFunctions(getApp(), "asia-northeast3");
      const analyzeScreenTime = httpsCallable<{ storagePath: string }, { analysisId: string }>(
        functions, "analyzeScreenTime"
      );
      const result = await analyzeScreenTime({ storagePath });

      setStatus("done");
      router.push(`/analysis/result/${result.data.analysisId}`);
    } catch (err: unknown) {
      setStatus("idle");
      setError(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "분석 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  }

  async function handleWeeklyAnalysis() {
    if (!user || weeklyStatus === "generating") return;
    setWeeklyError(null);
    setWeeklyStatus("generating");
    try {
      const functions = getFunctions(getApp(), "asia-northeast3");
      const generateWeeklyAnalysis = httpsCallable<Record<string, never>, { analysisId: string }>(
        functions, "generateWeeklyAnalysis"
      );
      const result = await generateWeeklyAnalysis({});
      router.push(`/analysis/result/${result.data.analysisId}`);
    } catch (err: unknown) {
      setWeeklyStatus("idle");
      setWeeklyError(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "주간 분석 중 오류가 발생했습니다."
      );
    }
  }

  function resetFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    setStatus("idle");
  }

  const isLoading = status === "uploading" || status === "analyzing";
  const canWeekly = dailyRecords.length >= WEEKLY_THRESHOLD;
  const needed = WEEKLY_THRESHOLD - dailyRecords.length;

  if (loading || !user) return null;

  return (
    <>
      <Navbar />
      <main
        className="min-h-screen pt-20"
        style={{ background: "#0A0A0F" }}
      >
        {/* background glow */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 70% 40%, rgba(61,219,135,0.07) 0%, transparent 70%)",
          }}
        />

        <div
          className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-20 py-16"
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2.5rem" }}
        >
          {/* ── 헤더 ── */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
              style={{ background: "rgba(61,219,135,0.1)", border: "1px solid rgba(61,219,135,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DDB87]" />
              <span className="text-xs font-semibold text-[#3DDB87]">AI 스크린타임 분석</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              오늘의 스크린타임을<br />
              <span style={{ color: "#3DDB87" }}>분석해드릴게요</span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              매일 <strong className="text-white">&apos;일&apos; 탭</strong> 스크린샷을 업로드해 일간 분석을 받고,
              7일치가 쌓이면 주간 종합 분석을 받을 수 있어요.
            </p>
          </div>

          {/* ── 2-column grid (lg+) ── */}
          <div className="grid gap-8 lg:gap-12" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

            {/* ── LEFT: 업로드 영역 ── */}
            <div className="flex flex-col gap-6">
              {/* 섹션 라벨 */}
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-white">일간 분석 업로드</h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(61,219,135,0.12)", border: "1px solid rgba(61,219,135,0.2)", color: "#3DDB87" }}>
                  &apos;일&apos; 탭 화면
                </span>
              </div>

              {hasUploadedToday ? (
                /* 오늘 이미 업로드한 경우 */
                <div className="rounded-2xl px-6 py-10 flex flex-col items-center gap-3 text-center"
                  style={{ background: "rgba(61,219,135,0.05)", border: "1px solid rgba(61,219,135,0.2)" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: "rgba(61,219,135,0.15)", color: "#3DDB87" }}>
                    ✓
                  </div>
                  <p className="text-base font-bold text-white">오늘 분석 완료!</p>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    일간 분석은 하루에 한 번만 가능합니다.<br />
                    내일 다시 스크린타임 스크린샷을 업로드해주세요.
                  </p>
                  <Link
                    href={`/analysis/result/${dailyRecords[0]?.id}`}
                    className="mt-1 text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: "#3DDB87" }}
                  >
                    오늘 분석 결과 보기
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </Link>
                </div>
              ) : !file ? (
                <div
                  className="rounded-2xl px-8 py-14 flex flex-col items-center gap-3 cursor-pointer transition-all"
                  style={{
                    border: `2px dashed ${dragging ? "#3DDB87" : "rgba(255,255,255,0.12)"}`,
                    background: dragging ? "rgba(61,219,135,0.06)" : "rgba(255,255,255,0.02)",
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <div className="mb-1" style={{ color: "rgba(61,219,135,0.7)" }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {dragging ? "여기에 놓으세요" : "클릭하거나 이미지를 드래그해서 업로드"}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>JPG, PNG, HEIC, WEBP · 최대 10MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-4 py-14 px-8">
                      <div className="w-12 h-12 rounded-full border-[3px] border-t-[#3DDB87] animate-spin"
                        style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }} />
                      <p className="text-lg font-semibold text-white">
                        {status === "uploading" ? "이미지 업로드 중..." : "AI가 분석하고 있습니다..."}
                      </p>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>잠시만 기다려주세요 (10~20초)</p>
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview!} alt="업로드된 스크린샷"
                        className="max-w-full max-h-[400px] rounded-2xl object-contain"
                        style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
                      <div className="flex gap-3">
                        <button
                          className="font-bold px-8 py-3.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity text-base border-none"
                          style={{ background: "#3DDB87", color: "#0A0A0F" }}
                          onClick={handleAnalyze}
                        >
                          AI 분석 시작
                        </button>
                        <button
                          className="rounded-full px-6 py-3.5 text-sm cursor-pointer transition-all"
                          style={{
                            background: "transparent",
                            color: "rgba(255,255,255,0.5)",
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                          onClick={resetFile}
                        >
                          다시 선택
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 에러 */}
              {error && (
                <p className="rounded-xl px-5 py-3.5 text-sm text-center"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  {error}
                </p>
              )}

              {/* 스크린샷 가이드 */}
              <div className="pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
                  &apos;일&apos; 탭 스크린샷 찍는 방법
                </p>
                <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                  <div className="rounded-2xl px-5 py-4 flex flex-col gap-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-xs font-bold" style={{ color: "#3DDB87" }}>iPhone / iPad</span>
                    <p className="text-[0.8rem] leading-relaxed m-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                      설정 → 스크린 타임 → 상단 <strong style={{ color: "#3DDB87" }}>&apos;일&apos;</strong> 탭 선택 후 캡처
                    </p>
                  </div>
                  <div className="rounded-2xl px-5 py-4 flex flex-col gap-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-xs font-bold" style={{ color: "#3DDB87" }}>Android (갤럭시 등)</span>
                    <p className="text-[0.8rem] leading-relaxed m-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                      설정 → 디지털 웰빙 및 자녀 보호 → 오늘 사용 시간 화면을 캡처
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: 주간 진행 현황 ── */}
            <div className="flex flex-col gap-5">
              {!recordsLoading && (
                <div className="rounded-2xl p-6"
                  style={{
                    background: canWeekly ? "rgba(61,219,135,0.05)" : "#111118",
                    border: canWeekly ? "1px solid rgba(61,219,135,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {canWeekly ? "🎉 주간 분석 준비 완료!" : "📅 이번 주 기록 현황"}
                      </span>
                      {!canWeekly && (
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>매주 월요일 초기화</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: canWeekly ? "rgba(61,219,135,0.2)" : "rgba(255,255,255,0.08)",
                        color: canWeekly ? "#3DDB87" : "rgba(255,255,255,0.5)",
                      }}>
                      {dailyRecords.length}/{WEEKLY_THRESHOLD}일
                    </span>
                  </div>

                  {/* 점수 도트 */}
                  <div className="flex items-center gap-1.5 mb-5">
                    {Array.from({ length: WEEKLY_THRESHOLD }).map((_, i) => {
                      const rec = dailyRecords[dailyRecords.length - 1 - (WEEKLY_THRESHOLD - 1 - i)];
                      const hasRecord = i < dailyRecords.length;
                      const score = hasRecord ? dailyRecords[dailyRecords.length - 1 - i]?.detoxScore ?? 0 : 0;
                      const barColor = score >= 70 ? "#3DDB87" : score >= 40 ? "#facc15" : "#f87171";
                      const days = ["월", "화", "수", "목", "금", "토", "일"];
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                          <div
                            className="w-full h-9 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all"
                            style={{
                              background: hasRecord ? barColor : "rgba(255,255,255,0.06)",
                              color: hasRecord ? "#0A0A0F" : "rgba(255,255,255,0.2)",
                            }}
                            title={hasRecord ? `${rec?.createdAt?.toLocaleDateString("ko-KR")} · ${score}점` : "미기록"}
                          >
                            {hasRecord ? score : ""}
                          </div>
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{days[i]}</span>
                        </div>
                      );
                    })}
                  </div>

                  {canWeekly ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                        7일치 일간 분석이 완성됐어요. 한 주의 패턴을 종합 분석해 드릴게요.
                      </p>
                      {weeklyError && (
                        <p className="text-xs rounded-lg px-3 py-2"
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                          {weeklyError}
                        </p>
                      )}
                      <button
                        onClick={handleWeeklyAnalysis}
                        disabled={weeklyStatus === "generating"}
                        className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: "#3DDB87", color: "#0A0A0F" }}
                      >
                        {weeklyStatus === "generating" ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 animate-spin"
                              style={{ borderColor: "rgba(10,10,15,0.2)", borderTopColor: "#0A0A0F" }} />
                            주간 분석 생성 중... (30~60초 소요)
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                            이번 주 종합 분석 시작
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {dailyRecords.length === 0
                        ? "아직 기록이 없어요. 오늘 스크린타임을 분석해보세요!"
                        : `${needed}일 더 기록하면 주간 종합 분석을 받을 수 있어요.`}
                    </p>
                  )}

                  {/* 최근 기록 바로가기 */}
                  {dailyRecords.length > 0 && (
                    <div className="mt-4 pt-4 flex items-center justify-between"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>최근 분석 결과</span>
                      <Link
                        href={`/analysis/result/${dailyRecords[0].id}`}
                        className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{ color: "#3DDB87" }}
                      >
                        {isSameDay(dailyRecords[0].createdAt, new Date()) ? "오늘 결과 보기" : "최근 결과 보기"}
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 8h10M9 4l4 4-4 4" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* 팁 카드 */}
              <div className="rounded-2xl px-5 py-4 flex gap-3 items-start"
                style={{ background: "rgba(61,219,135,0.04)", border: "1px solid rgba(61,219,135,0.12)" }}>
                <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "rgba(61,219,135,0.12)", color: "#3DDB87" }}>
                  💡
                </div>
                <div>
                  <p className="text-xs font-semibold text-white mb-1">더 정확한 분석을 위한 팁</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    스크린샷은 오늘 하루가 거의 끝난 저녁에 찍을수록 더 정확한 분석 결과를 받을 수 있어요.
                    &apos;일&apos; 탭 전체가 보이도록 캡처해주세요.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
