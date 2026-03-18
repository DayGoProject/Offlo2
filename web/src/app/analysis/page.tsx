"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { useAuth } from "@/hooks/useAuth";
import { storage } from "@/services/firebase";
import Navbar from "@/components/Navbar";
import s from "./analysis.module.css";

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
    if (!loading && !user) {
      router.replace("/login");
    }
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
    const url = URL.createObjectURL(selected);
    setPreview(url);
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
      <main className={s.main}>
        <div className={s.container}>
          <div className={s.header}>
            <h1 className={s.title}>
              AI <span className="text-gradient">스크린타임 분석</span>
            </h1>
            <p className={s.subtitle}>
              스마트폰 스크린타임 스크린샷을 업로드하면<br />
              AI가 사용 습관을 분석하고 디톡스 방법을 추천합니다.
            </p>
          </div>

          {!file ? (
            <div
              className={`${s.dropzone} ${dragging ? s.dropzoneDragging : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className={s.hiddenInput}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className={s.dropzoneIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={s.dropzoneText}>
                {dragging ? "여기에 놓으세요" : "클릭하거나 이미지를 드래그해서 업로드"}
              </p>
              <p className={s.dropzoneHint}>JPG, PNG, HEIC, WEBP · 최대 10MB</p>
            </div>
          ) : (
            <div className={s.previewArea}>
              {isLoading ? (
                <div className={s.loadingBox}>
                  <div className={s.spinner} />
                  <p className={s.loadingText}>
                    {status === "uploading" ? "이미지 업로드 중..." : "AI가 분석하고 있습니다..."}
                  </p>
                  <p className={s.loadingHint}>잠시만 기다려주세요 (10~20초)</p>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview!} alt="업로드된 스크린샷" className={s.previewImage} />
                  <div className={s.previewActions}>
                    <button className={s.analyzeButton} onClick={handleAnalyze}>
                      AI 분석 시작
                    </button>
                    <button className={s.resetButton} onClick={resetFile}>
                      다시 선택
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className={s.errorText}>{error}</p>}

          <div className={s.guide}>
            <h2 className={s.guideTitle}>스크린샷 찍는 방법</h2>
            <div className={s.guideCards}>
              <div className={s.guideCard}>
                <span className={s.guideLabel}>iPhone / iPad</span>
                <p>설정 → 스크린 타임 → 앱 사용 시간 화면을 캡처해주세요.</p>
              </div>
              <div className={s.guideCard}>
                <span className={s.guideLabel}>Android (갤럭시 등)</span>
                <p>설정 → 디지털 웰빙 및 자녀 보호 → 앱 사용 시간 화면을 캡처해주세요.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
