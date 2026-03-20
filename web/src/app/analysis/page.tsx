"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { useAuth } from "@/hooks/useAuth";
import { storage } from "@/services/firebase";
import Navbar from "@/components/Navbar";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];
const MAX_SIZE_MB = 10;

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

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
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: file.type });

      setStatus("analyzing");
      const functions = getFunctions(getApp(), "asia-northeast3");
      const analyzeScreenTime = httpsCallable<{ storagePath: string }, { analysisId: string }>(
        functions,
        "analyzeScreenTime"
      );
      const result = await analyzeScreenTime({ storagePath });

      setStatus("done");
      router.push(`/analysis/result/${result.data.analysisId}`);
    } catch (err: unknown) {
      setStatus("idle");
      if (err && typeof err === "object" && "message" in err) {
        setError((err as { message: string }).message);
      } else {
        setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
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

  if (loading || !user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-10">

          {/* 헤더 */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-[#0A0A0F] dark:text-white">
              AI <span className="text-gradient">스크린타임 분석</span>
            </h1>
            <p className="text-base text-black/50 dark:text-white/55 leading-relaxed">
              스마트폰 스크린타임 스크린샷을 업로드하면<br />
              AI가 사용 습관을 분석하고 디톡스 방법을 추천합니다.
            </p>
          </div>

          {!file ? (
            /* 드롭존 */
            <div
              className={`border-2 border-dashed rounded-2xl px-8 py-16 flex flex-col items-center gap-3 cursor-pointer transition-all ${
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
            /* 프리뷰 */
            <div className="flex flex-col items-center gap-6">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-16 px-8">
                  <div className="w-12 h-12 rounded-full border-[3px] border-brand/20 border-t-brand animate-spin" />
                  <p className="text-lg font-semibold text-[#0A0A0F] dark:text-white">
                    {status === "uploading" ? "이미지 업로드 중..." : "AI가 분석하고 있습니다..."}
                  </p>
                  <p className="text-sm text-black/40 dark:text-white/40">잠시만 기다려주세요 (10~20초)</p>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview!}
                    alt="업로드된 스크린샷"
                    className="max-w-full max-h-[480px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] object-contain"
                  />
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

          {/* 에러 */}
          {error && (
            <p className="bg-red-500/[0.08] border border-red-500/[0.2] rounded-xl px-5 py-3.5 text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          {/* 가이드 */}
          <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-8">
            <h2 className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest mb-4">
              스크린샷 찍는 방법
            </h2>
            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 flex flex-col gap-2">
                <span className="text-xs font-bold text-brand">iPhone / iPad</span>
                <p className="text-[0.82rem] text-black/50 dark:text-white/50 leading-relaxed m-0">
                  설정 → 스크린 타임 → 앱 사용 시간 화면을 캡처해주세요.
                </p>
              </div>
              <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 flex flex-col gap-2">
                <span className="text-xs font-bold text-brand">Android (갤럭시 등)</span>
                <p className="text-[0.82rem] text-black/50 dark:text-white/50 leading-relaxed m-0">
                  설정 → 디지털 웰빙 및 자녀 보호 → 앱 사용 시간 화면을 캡처해주세요.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
