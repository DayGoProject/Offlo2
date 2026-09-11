"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analyzeScreenTime, generateWeeklyAnalysis, DailySummary } from "@/services/ai";
import { fileToInlineImage } from "@/services/image";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import Modal from "@/components/app/Modal";
import { ErrorNote } from "@/components/app/Field";
import { fmtHM, relDate } from "@/lib/format";

// HEIC은 브라우저가 디코딩하지 못해 제외 (스크린샷은 PNG/JPG로 저장됨)
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
const WEEKLY_THRESHOLD = 7; // 주간 분석에 필요한 일간 분석 수
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

/** 두 Date가 같은 날(로컬 기준)인지 확인 */
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 이번 주 월요일 00:00 KST를 UTC 밀리초로 */
function weekStartUTC(): number {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + KST_OFFSET);
  const dayOfWeek = kstNow.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const kstMonday = new Date(kstNow);
  kstMonday.setUTCDate(kstNow.getUTCDate() + daysToMonday);
  kstMonday.setUTCHours(0, 0, 0, 0);
  return kstMonday.getTime() - KST_OFFSET;
}

interface DailyRecord {
  id: string;
  detoxScore: number;
  totalMinutes: number;
  createdAt: Date;
  apps: { appName: string; minutes: number; category: string }[];
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 업로드 상태
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [howTo, setHowTo] = useState(false);
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

  // 일간 분석 기록 로드 (이번 주 분석 현황용)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/analyses?periodType=daily&limit=${WEEKLY_THRESHOLD}&includeApps=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const json = await res.json();
        const raw: Array<{
          id: string;
          detoxScore: number;
          totalMinutes: number;
          createdAt: string;
          apps: { appName: string; minutes: number; category: string }[];
        }> = json.analyses ?? [];

        // 이번 주 월요일 이후 데이터만 필터
        const start = weekStartUTC();
        const records: DailyRecord[] = raw
          .filter((a) => new Date(a.createdAt).getTime() >= start)
          .map((a) => ({
            id: a.id,
            detoxScore: a.detoxScore,
            totalMinutes: a.totalMinutes,
            createdAt: new Date(a.createdAt),
            apps: a.apps ?? [],
          }));

        setDailyRecords(records);
        if (records.length > 0 && isSameDay(records[0].createdAt, new Date())) {
          setHasUploadedToday(true);
        }
      } catch {
        // 기록 로드 실패는 기능 저하 허용
      } finally {
        setRecordsLoading(false);
      }
    })();
  }, [user]);

  function handleFile(selected: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
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
      const { imageBase64, mimeType } = await fileToInlineImage(file);

      setStatus("analyzing");
      const { analysisData } = await analyzeScreenTime({ imageBase64, mimeType });

      setStatus("saving");
      const token = await user.getIdToken();
      const saveRes = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(analysisData),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error ?? "분석 결과 저장에 실패했습니다.");
      }

      const { analysisId } = await saveRes.json();
      setStatus("done");
      router.push(`/analysis/result/${analysisId}`);
    } catch (err: unknown) {
      setStatus("idle");
      setError(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "분석 중 오류가 발생했습니다. 다시 시도해주세요.",
      );
    }
  }

  async function handleWeeklyAnalysis() {
    if (!user || weeklyStatus === "generating") return;
    setWeeklyError(null);
    setWeeklyStatus("generating");
    try {
      const token = await user.getIdToken();

      // 이번 주 일간 분석 전체 데이터 조회 (apps 포함)
      const res = await fetch(`/api/analyses?periodType=daily&limit=${WEEKLY_THRESHOLD}&includeApps=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("기록을 불러오는 중 오류가 발생했습니다.");
      const json = await res.json();

      const raw: Array<{
        id: string;
        detoxScore: number;
        totalMinutes: number;
        createdAt: string;
        apps: { appName: string; minutes: number; category: string }[];
      }> = json.analyses ?? [];

      const start = weekStartUTC();
      const weekRecords = raw.filter((a) => new Date(a.createdAt).getTime() >= start);

      if (weekRecords.length < WEEKLY_THRESHOLD) {
        throw new Error(
          `이번 주 일간 분석이 ${weekRecords.length}개 있습니다. 7개가 모여야 주간 분석을 시작할 수 있습니다.`,
        );
      }

      const sourceAnalysisIds = weekRecords.map((r) => r.id);

      const dailySummaries: DailySummary[] = weekRecords.reverse().map((r) => ({
        date: new Date(r.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }),
        totalMinutes: r.totalMinutes,
        apps: r.apps,
        detoxScore: r.detoxScore,
      }));

      const { analysisData } = await generateWeeklyAnalysis({ dailySummaries });

      const saveRes = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...analysisData, sourceAnalysisIds }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error ?? "주간 분석 결과 저장에 실패했습니다.");
      }

      const { analysisId } = await saveRes.json();
      router.push(`/analysis/result/${analysisId}`);
    } catch (err: unknown) {
      setWeeklyStatus("idle");
      setWeeklyError(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "주간 분석 중 오류가 발생했습니다.",
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

  const isLoading = status === "uploading" || status === "analyzing" || status === "saving";
  const canWeekly = dailyRecords.length >= WEEKLY_THRESHOLD;
  const needed = WEEKLY_THRESHOLD - dailyRecords.length;

  if (loading || !user) return null;

  /* 무대(드롭존) 공통 껍데기 — 상태에 따라 내용만 바뀐다 */
  const stageStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: `1.5px dashed ${dragging ? "var(--color-bloom)" : "rgba(216,216,216,0.16)"}`,
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={hasUploadedToday ? "오늘 분석 완료 · 하루 1회" : "오늘 분석 전 · 하루 1회"}
        title="AI 분석"
        actions={
          <>
            <Pill onClick={() => setHowTo(true)}>분석 방법</Pill>
            {!hasUploadedToday && (
              <Pill onClick={() => inputRef.current?.click()} variant="primary">
                스크린샷 올리기
              </Pill>
            )}
          </>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* ── 업로드 무대 ── */}
      <section
        className="relative flex flex-col items-center justify-center gap-[18px] w-full min-h-[320px] px-6 py-10 rounded-card overflow-hidden text-center"
        style={stageStyle}
        onDragOver={(e) => {
          if (hasUploadedToday || file) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={hasUploadedToday || file ? undefined : handleDrop}
      >
        {/* 중앙 번짐 */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
          style={{
            width: 520,
            height: 520,
            marginLeft: -260,
            marginTop: -260,
            maxWidth: "160%",
            background: "radial-gradient(circle at 50% 50%, rgba(61,219,135,0.09) 0%, transparent 66%)",
          }}
        />

        {hasUploadedToday ? (
          <>
            <span
              className="relative flex items-center justify-center w-[52px] h-[52px] rounded-full shrink-0"
              style={{ background: "var(--accent-soft)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5 12.6 9.8 17.4 19 6.8"
                  fill="none"
                  stroke="var(--color-bloom)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="relative flex flex-col items-center gap-[7px]">
              <p className="text-[19px] leading-6 font-semibold tracking-[-0.015em]" style={{ color: "var(--text-primary)" }}>
                오늘 분석을 마쳤어요
              </p>
              <p className="text-[13px] leading-5 max-w-[420px]" style={{ color: "var(--text-muted)" }}>
                일간 분석은 하루에 한 번만 가능합니다. 내일 다시 스크린타임 스크린샷을 올려주세요.
              </p>
            </div>
            {dailyRecords[0] && (
              <Pill href={`/analysis/result/${dailyRecords[0].id}`} variant="primary" className="relative">
                오늘 결과 보기
              </Pill>
            )}
          </>
        ) : isLoading ? (
          <>
            <div
              className="relative w-12 h-12 rounded-full border-[3px] animate-spin"
              style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }}
            />
            <div className="relative flex flex-col items-center gap-[7px]">
              <p className="text-[19px] leading-6 font-semibold tracking-[-0.015em]" style={{ color: "var(--text-primary)" }}>
                {status === "uploading" ? "이미지 준비 중…" : status === "saving" ? "결과 저장 중…" : "AI가 분석하고 있어요"}
              </p>
              <p className="text-[13px] leading-4" style={{ color: "var(--text-muted)" }}>
                잠시만 기다려 주세요 (10~20초)
              </p>
            </div>
          </>
        ) : file ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview!}
              alt="업로드된 스크린샷"
              className="relative max-w-full max-h-[320px] rounded-lg object-contain"
              style={{ border: "1px solid var(--border-card)" }}
            />
            <div className="relative flex flex-wrap items-center justify-center gap-2.5">
              <Pill onClick={handleAnalyze} variant="accent">
                AI 분석 시작
              </Pill>
              <Pill onClick={resetFile}>다시 선택</Pill>
            </div>
          </>
        ) : (
          <>
            <span
              className="relative flex items-center justify-center w-[52px] h-[52px] rounded-full shrink-0"
              style={{ background: "var(--accent-soft)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 17V6M7.5 10.5 12 6l4.5 4.5"
                  fill="none"
                  stroke="var(--color-bloom)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M4 19h16" fill="none" stroke="var(--color-bloom)" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>

            <div className="relative flex flex-col items-center gap-[7px]">
              <p className="text-[19px] leading-6 font-semibold tracking-[-0.015em]" style={{ color: "var(--text-primary)" }}>
                {dragging ? "여기에 놓으세요" : "스크린타임 스크린샷을 올려주세요"}
              </p>
              <p className="text-[13px] leading-5 max-w-[460px]" style={{ color: "var(--text-muted)" }}>
                설정 → 스크린타임의 &apos;일&apos; 탭 화면을 캡처해 끌어다 놓거나 클릭해서 선택하세요
              </p>
            </div>

            <div className="relative flex flex-wrap items-center justify-center gap-2.5">
              <Pill onClick={() => inputRef.current?.click()} variant="primary">
                파일 선택
              </Pill>
              <span className="num text-xs" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
                JPG · PNG · WEBP · 최대 {MAX_SIZE_MB}MB
              </span>
            </div>

            <div className="relative flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <circle cx="7" cy="7" r="5.8" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" />
                <path d="M7 4.2v3.2" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="7" cy="9.6" r="0.7" fill="var(--text-muted)" />
              </svg>
              <span className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
                이미지는 분석 즉시 폐기되며 저장되지 않습니다
              </span>
            </div>
          </>
        )}
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* ── 주간 종합 분석 · 최근 결과 ── */}
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        <section
          className="flex flex-col gap-[18px] flex-1 min-w-0 px-[22px] sm:px-7 py-6 rounded-card"
          style={{
            background: "var(--bg-card)",
            border: `1px solid ${canWeekly ? "rgba(61,219,135,0.22)" : "var(--border-card)"}`,
          }}
        >
          <div className="flex items-center justify-between gap-3 w-full">
            <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
              주간 종합 분석
            </h2>
            <span className="num text-xs font-medium shrink-0" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
              {recordsLoading ? "—" : `${dailyRecords.length} / ${WEEKLY_THRESHOLD}`}
            </span>
          </div>

          <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-muted)" }}>
            이번 주 일간 분석 {WEEKLY_THRESHOLD}개를 모두 완료하면 주간 종합 분석을 받을 수 있습니다. 매주 월요일 초기화됩니다.
          </p>

          {/* 요일 칸 — 기록이 있으면 점수를 그 자리에 박는다 */}
          <div className="flex gap-2 w-full">
            {Array.from({ length: WEEKLY_THRESHOLD }).map((_, i) => {
              // dailyRecords는 최신순이므로 뒤집어 월→일 순으로 채운다
              const rec = dailyRecords[dailyRecords.length - 1 - i] ?? null;
              return (
                <div key={i} className="flex flex-col items-center gap-[7px] flex-1 min-w-0">
                  <div
                    className="flex items-center justify-center w-full h-[38px] rounded-lg shrink-0"
                    style={
                      rec
                        ? { background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.25)" }
                        : { background: "var(--score-track)" }
                    }
                    title={rec ? `${rec.createdAt.toLocaleDateString("ko-KR")} · ${rec.detoxScore}점` : "미기록"}
                  >
                    {rec && (
                      <span className="num text-[13px]" style={{ color: "var(--color-bloom)", fontWeight: 500, letterSpacing: 0 }}>
                        {rec.detoxScore}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[11px] leading-[14px]"
                    style={{ color: rec ? "var(--text-muted)" : "var(--text-ghost)" }}
                  >
                    {DAYS[i]}
                  </span>
                </div>
              );
            })}
          </div>

          {weeklyError && <ErrorNote>{weeklyError}</ErrorNote>}

          {canWeekly ? (
            <button
              onClick={handleWeeklyAnalysis}
              disabled={weeklyStatus === "generating"}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: "var(--color-bloom)", color: "var(--bg-page)" }}
            >
              {weeklyStatus === "generating" ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: "rgba(4,5,8,0.25)", borderTopColor: "#040508" }}
                  />
                  주간 분석 생성 중… (30~60초)
                </>
              ) : (
                "이번 주 종합 분석 시작"
              )}
            </button>
          ) : (
            <div
              className="flex items-center justify-center w-full h-10 rounded-full text-[13px] font-medium"
              style={{ background: "var(--score-track)", color: "var(--text-faint)" }}
            >
              {recordsLoading
                ? "불러오는 중…"
                : dailyRecords.length === 0
                  ? "오늘 분석부터 시작해 보세요"
                  : `${needed}개 더 완료하면 열립니다`}
            </div>
          )}
        </section>

        <section
          className="flex flex-col gap-4 w-full lg:w-[400px] shrink-0 px-[22px] sm:px-7 py-6 rounded-card"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
        >
          <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
            최근 분석 결과
          </h2>

          {recordsLoading ? (
            <div className="h-[60px] w-full rounded-[9px] animate-pulse" style={{ background: "var(--bg-bar)" }} />
          ) : dailyRecords.length === 0 ? (
            <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-muted)" }}>
              이번 주 기록이 아직 없어요. 첫 분석을 올리면 여기에 쌓입니다.
            </p>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {dailyRecords.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={`/analysis/result/${r.id}`}
                  className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-[9px] transition-opacity hover:opacity-80"
                  style={{ background: "var(--bg-nav)" }}
                >
                  <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                    <span className="text-[13px] leading-4 font-medium" style={{ color: "var(--text-primary)" }}>
                      {relDate(r.createdAt.toISOString())} · 일간
                    </span>
                    <span className="num text-xs leading-4" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
                      {fmtHM(r.totalMinutes)}
                    </span>
                  </div>
                  <span className="num text-xl leading-6 shrink-0" style={{ color: "var(--text-primary)", fontWeight: 500, letterSpacing: 0 }}>
                    {r.detoxScore}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div
            className="flex items-start gap-2.5 w-full px-4 py-3.5 rounded-[9px] mt-auto"
            style={{ background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.14)" }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-1">
              <path
                d="M7 1.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L7 10l-3.5 1.9.8-3.9L1.4 5.3l3.9-.5L7 1.2z"
                fill="var(--color-bloom)"
                opacity="0.85"
              />
            </svg>
            <p className="text-xs leading-[19px]" style={{ color: "var(--text-primary-soft)" }}>
              더 정확한 분석을 위한 팁 — 하루가 끝난 저녁에, &apos;일&apos; 탭 화면 전체가 보이도록 캡처하면 앱별 시간을 더 잘 읽습니다.
            </p>
          </div>
        </section>
      </div>

      {/* ── 분석 방법 ── */}
      <Modal open={howTo} onClose={() => setHowTo(false)} title="스크린샷 찍는 방법">
        <div className="flex flex-col gap-3">
          {[
            {
              os: "iPhone / iPad",
              step: "설정 → 스크린 타임 → 상단 '일' 탭을 선택한 뒤 화면 전체를 캡처하세요.",
            },
            {
              os: "Android (갤럭시 등)",
              step: "설정 → 디지털 웰빙 및 자녀 보호 기능 → 오늘 사용 시간 화면을 캡처하세요.",
            },
          ].map(({ os, step }) => (
            <div
              key={os}
              className="flex flex-col gap-2 px-[18px] py-4 rounded-[9px]"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--color-bloom)", letterSpacing: "0.06em" }}>
                {os}
              </span>
              <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-primary-soft)" }}>
                {step}
              </p>
            </div>
          ))}
          <p className="text-xs leading-[19px]" style={{ color: "var(--text-muted)" }}>
            일간 분석은 하루 1회입니다. 7일치가 쌓이면 주간 종합 분석이 열립니다.
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}
