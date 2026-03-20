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
        const q = query(
          collection(db, "users", user!.uid, "analyses"),
          where("periodType", "==", "daily"),
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
      <main className="min-h-screen pt-20">
        <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-10">

          {/* ── 헤더 ── */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-[#0A0A0F] dark:text-white">
              AI <span className="text-gradient">스크린타임 분석</span>
            </h1>
            <p className="text-base text-black/50 dark:text-white/55 leading-relaxed">
              매일 <strong className="text-[#0A0A0F] dark:text-white">&apos;일&apos; 탭</strong> 스크린샷을 업로드해 일간 분석을 받고,<br />
              7일이 쌓이면 주간 종합 분석을 받을 수 있어요.
            </p>
          </div>

          {/* ── 주간 진행 현황 ── */}
          {!recordsLoading && (
            <div className={`rounded-2xl border p-6 ${
              canWeekly
                ? "bg-brand/[0.05] border-brand/30"
                : "bg-white/70 dark:bg-white/[0.03] border-black/[0.08] dark:border-white/[0.08] shadow-sm dark:shadow-none"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#0A0A0F] dark:text-white">
                  {canWeekly ? "🎉 주간 분석 준비 완료!" : "📅 이번 주 기록 현황"}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  canWeekly
                    ? "bg-brand/20 text-brand"
                    : "bg-black/[0.06] dark:bg-white/[0.08] text-black/50 dark:text-white/50"
                }`}>
                  {dailyRecords.length}/{WEEKLY_THRESHOLD}일
                </span>
              </div>

              {/* 점수 도트 */}
              <div className="flex items-center gap-2 mb-4">
                {Array.from({ length: WEEKLY_THRESHOLD }).map((_, i) => {
                  const rec = dailyRecords[dailyRecords.length - 1 - (WEEKLY_THRESHOLD - 1 - i)];
                  const hasRecord = i < dailyRecords.length;
                  const score = hasRecord ? dailyRecords[dailyRecords.length - 1 - i]?.detoxScore ?? 0 : 0;
                  const dotColor = score >= 70 ? "bg-brand" : score >= 40 ? "bg-yellow-400" : "bg-red-400";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                          hasRecord
                            ? `${dotColor} text-white shadow-sm`
                            : "bg-black/[0.05] dark:bg-white/[0.06] text-black/20 dark:text-white/20"
                        }`}
                        title={hasRecord ? `${rec?.createdAt?.toLocaleDateString("ko-KR")} · ${score}점` : "미기록"}
                      >
                        {hasRecord ? score : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              {canWeekly ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-black/60 dark:text-white/60">
                    7일치 일간 분석이 완성됐어요. 한 주의 패턴을 종합 분석해 드릴게요.
                  </p>
                  {weeklyError && (
                    <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {weeklyError}
                    </p>
                  )}
                  <button
                    onClick={handleWeeklyAnalysis}
                    disabled={weeklyStatus === "generating"}
                    className="w-full flex items-center justify-center gap-2 bg-brand text-[#0A0A0F] font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {weeklyStatus === "generating" ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-[#0A0A0F]/20 border-t-[#0A0A0F] animate-spin" />
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
                <p className="text-sm text-black/50 dark:text-white/50">
                  {dailyRecords.length === 0
                    ? "아직 기록이 없어요. 오늘 스크린타임을 분석해보세요!"
                    : `${needed}일 더 기록하면 주간 종합 분석을 받을 수 있어요.`}
                </p>
              )}

              {/* 최근 기록 바로가기 */}
              {dailyRecords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-black/40 dark:text-white/40">최근 분석 결과</span>
                  <Link
                    href={`/analysis/result/${dailyRecords[0].id}`}
                    className="text-xs text-brand font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
                  >
                    어제 결과 보기
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── 일간 업로드 ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-[#0A0A0F] dark:text-white">오늘 일간 분석 업로드</h2>
              <span className="text-xs bg-brand/10 border border-brand/20 text-brand px-2 py-0.5 rounded-full font-semibold">
                &apos;일&apos; 탭 화면
              </span>
            </div>

            {!file ? (
              <div
                className={`border-2 border-dashed rounded-2xl px-8 py-14 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                  dragging
                    ? "border-brand bg-brand/[0.06]"
                    : "border-black/[0.12] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.02] hover:border-brand/40 hover:bg-brand/[0.02]"
                }`}
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
                <div className="text-brand/70 mb-1">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-black/80 dark:text-white/80">
                  {dragging ? "여기에 놓으세요" : "클릭하거나 이미지를 드래그해서 업로드"}
                </p>
                <p className="text-xs text-black/35 dark:text-white/35">JPG, PNG, HEIC, WEBP · 최대 10MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-4 py-14 px-8">
                    <div className="w-12 h-12 rounded-full border-[3px] border-brand/20 border-t-brand animate-spin" />
                    <p className="text-lg font-semibold text-[#0A0A0F] dark:text-white">
                      {status === "uploading" ? "이미지 업로드 중..." : "AI가 분석하고 있습니다..."}
                    </p>
                    <p className="text-sm text-black/40 dark:text-white/40">잠시만 기다려주세요 (10~20초)</p>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview!} alt="업로드된 스크린샷"
                      className="max-w-full max-h-[480px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] object-contain" />
                    <div className="flex gap-3">
                      <button
                        className="bg-brand text-[#0A0A0F] font-bold px-8 py-3.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity text-base border-none"
                        onClick={handleAnalyze}
                      >
                        AI 분석 시작
                      </button>
                      <button
                        className="bg-transparent text-black/50 dark:text-white/50 border border-black/[0.12] dark:border-white/[0.12] rounded-full px-6 py-3.5 text-sm cursor-pointer hover:text-black/80 dark:hover:text-white/80 hover:border-black/25 dark:hover:border-white/25 transition-all"
                        onClick={resetFile}
                      >
                        다시 선택
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 에러 */}
          {error && (
            <p className="bg-red-500/[0.08] border border-red-500/[0.2] rounded-xl px-5 py-3.5 text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          {/* ── 스크린샷 가이드 ── */}
          <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-8">
            <h2 className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest mb-4">
              &apos;일&apos; 탭 스크린샷 찍는 방법
            </h2>
            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 flex flex-col gap-2">
                <span className="text-xs font-bold text-brand">iPhone / iPad</span>
                <p className="text-[0.82rem] text-black/50 dark:text-white/50 leading-relaxed m-0">
                  설정 → 스크린 타임 → 상단 <strong className="text-brand">&apos;일&apos;</strong> 탭 선택 후 캡처해주세요.
                </p>
              </div>
              <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 flex flex-col gap-2">
                <span className="text-xs font-bold text-brand">Android (갤럭시 등)</span>
                <p className="text-[0.82rem] text-black/50 dark:text-white/50 leading-relaxed m-0">
                  설정 → 디지털 웰빙 및 자녀 보호 → 오늘 사용 시간 화면을 캡처해주세요.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
