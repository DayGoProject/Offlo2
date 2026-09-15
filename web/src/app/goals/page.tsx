"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import Modal from "@/components/app/Modal";
import Field, { ErrorNote, inputClass, inputStyle } from "@/components/app/Field";
import { fmt, fmtDate } from "@/lib/format";
import { kstDateKey, DAY_MS } from "@/lib/kst";

/* ── 타입 ──────────────────────────────────────────────────────── */

interface Goal {
  id: string;
  title: string;
  targetMinutes: number;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "paused";
  createdAt: string;
}

const PRESETS = [30, 60, 90, 120, 180];

/* ── 유틸 ──────────────────────────────────────────────────────── */

/** 기간 대비 경과일. 달성률이 아니라 '진행률'이다 — 실제 달성 여부는
 *  일간 분석이 쌓여야 알 수 있고, 목표 완료는 사용자가 직접 처리한다. */
function progress(g: Goal): { done: number; total: number; left: number; pct: number } {
  const day = 86400000;
  const start = new Date(g.startDate).setHours(0, 0, 0, 0);
  const end = new Date(g.endDate).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  const total = Math.max(1, Math.round((end - start) / day) + 1);
  const done = Math.max(0, Math.min(total, Math.round((today - start) / day) + 1));
  return { done, total, left: total - done, pct: Math.round((done / total) * 100) };
}

/* ── 진행 중 목표 행 ───────────────────────────────────────────── */

function ActiveGoal({
  goal,
  onComplete,
  onDelete,
}: {
  goal: Goal;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { done, total, left, pct } = progress(goal);
  const expired = left <= 0;

  return (
    <div
      className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-[26px] w-full px-[22px] sm:px-7 py-6 rounded-card"
      style={{
        background: "var(--bg-card)",
        // 마감이 지난 목표는 강조하지 않는다 — 재촉이 아니라 정리의 대상이다
        border: `1px solid ${expired ? "var(--border-card)" : "rgba(61,219,135,0.18)"}`,
      }}
    >
      <div className="flex flex-col gap-2 shrink-0 lg:w-[290px] min-w-0">
        <h3
          className="text-[17px] leading-[22px] font-semibold tracking-[-0.015em]"
          style={{ color: "var(--text-primary)" }}
        >
          {goal.title}
        </h3>
        <p className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
          <span className="num" style={{ letterSpacing: 0 }}>
            {fmtDate(goal.startDate)}
          </span>
          {" — "}
          <span className="num" style={{ letterSpacing: 0 }}>
            {fmtDate(goal.endDate)}
          </span>
          {" · 하루 "}
          {fmt(goal.targetMinutes)} 이하
        </p>
      </div>

      <div className="flex flex-col gap-2.5 flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 w-full">
          <span className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
            진행률
          </span>
          <span className="num text-[22px] leading-7" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            {pct}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full shrink-0" style={{ background: "var(--score-track)" }}>
          <div className="h-full rounded-full" style={{ background: "var(--color-bloom)", width: `${pct}%` }} />
        </div>
        <p
          className="text-xs leading-4"
          style={{ color: expired ? "var(--text-muted)" : "var(--color-bloom)" }}
        >
          {total}일 중 {done}일 지남 · {expired ? "기간이 끝났어요" : `${left}일 남음`}
        </p>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onDelete(goal.id)}
          className="flex items-center h-[34px] px-4 rounded-full text-xs font-medium transition-opacity hover:opacity-70 cursor-pointer"
          style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
        >
          삭제
        </button>
        <button
          onClick={() => onComplete(goal.id)}
          className="flex items-center h-[34px] px-4 rounded-full text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
          style={{ background: "var(--color-bloom)", color: "var(--bg-page)" }}
        >
          완료 처리
        </button>
      </div>
    </div>
  );
}

/* ── 메인 페이지 ────────────────────────────────────────────────── */

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", targetMinutes: 60, startDate: "", endDate: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/goals", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setGoals((await res.json()).goals ?? []);
      } catch (e) {
        // 실패해도 스켈레톤이 영원히 남지 않도록 finally에서 반드시 푼다
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleComplete(id: string) {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, status: "completed" } : g)));
  }

  async function handleDelete(id: string) {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/goals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function openModal() {
    // UTC 날짜로 채우면 오전 9시(KST) 전에 열었을 때 시작일이 어제가 된다
    const today = kstDateKey();
    const nextWeek = kstDateKey(Date.now() + 7 * DAY_MS);
    setForm({ title: "", targetMinutes: 60, startDate: today, endDate: nextWeek });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!user) return;
    setFormError("");

    if (!form.title.trim()) return setFormError("제목을 입력해주세요.");
    if (!form.startDate || !form.endDate) return setFormError("기간을 설정해주세요.");
    if (new Date(form.endDate) <= new Date(form.startDate))
      return setFormError("종료일은 시작일 이후여야 합니다.");

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const { goal } = await res.json();
        setGoals((prev) => [goal, ...prev]);
        setShowModal(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error ?? "목표 생성에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) return null;

  const active = goals.filter((g) => g.status !== "completed");
  const done = goals.filter((g) => g.status === "completed");

  return (
    <AppShell>
      <PageHeader
        eyebrow={loading ? "불러오는 중" : `진행 중 ${active.length}개 · 완료 ${done.length}개`}
        title="목표 관리"
        actions={
          <>
            {done.length > 0 && (
              <Pill onClick={() => setShowDone((v) => !v)}>
                {showDone ? "완료 숨기기" : "완료한 목표"}
              </Pill>
            )}
            <Pill onClick={openModal} variant="primary">
              새 목표 추가
            </Pill>
          </>
        }
      />

      {/* ── 진행 중 ── */}
      <section className="flex flex-col gap-3.5 w-full">
        <h2
          className="text-[11px] leading-[14px] font-semibold"
          style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
        >
          진행 중
        </h2>

        {loading ? (
          <div className="h-[118px] w-full rounded-card animate-pulse" style={{ background: "var(--bg-bar)" }} />
        ) : active.length === 0 ? (
          <div
            className="flex flex-col items-start gap-4 w-full px-[22px] sm:px-7 py-8 rounded-card"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
          >
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>
                진행 중인 목표가 없어요
              </p>
              <p className="text-[13px] leading-5" style={{ color: "var(--text-muted)" }}>
                하루 사용 시간 상한을 하나만 정해도 달라집니다. 기간은 일주일이면 충분해요.
              </p>
            </div>
            <Pill onClick={openModal} variant="accent">
              목표 추가하기
            </Pill>
          </div>
        ) : (
          active.map((g) => (
            <ActiveGoal key={g.id} goal={g} onComplete={handleComplete} onDelete={handleDelete} />
          ))
        )}
      </section>

      {/* ── 완료한 목표 ── */}
      {showDone && done.length > 0 && (
        <section className="flex flex-col gap-3.5 w-full">
          <h2
            className="text-[11px] leading-[14px] font-semibold"
            style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
          >
            완료한 목표
          </h2>

          <div
            className="flex flex-col w-full rounded-card overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
          >
            {done.map((g, i) => (
              <div
                key={g.id}
                className="flex items-center gap-3 sm:gap-4 w-full px-[22px] sm:px-[26px] py-4"
                style={{ borderBottom: i === done.length - 1 ? undefined : "1px solid var(--border-card)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <circle cx="8" cy="8" r="7" fill="var(--accent-soft)" />
                  <path
                    d="M4.8 8.2 6.9 10.3 11.2 6"
                    fill="none"
                    stroke="var(--color-bloom)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm leading-[18px] flex-1 min-w-0 truncate" style={{ color: "var(--text-primary)" }}>
                  {g.title}
                </span>
                <span
                  className="num text-xs leading-4 shrink-0 hidden sm:inline"
                  style={{ color: "var(--text-muted)", letterSpacing: 0, width: 96 }}
                >
                  {fmtDate(g.endDate)}
                </span>
                <span
                  className="text-xs leading-4 font-medium shrink-0 text-right"
                  style={{ color: "var(--color-bloom)", width: 60 }}
                >
                  +20분
                </span>
                <button
                  onClick={() => handleDelete(g.id)}
                  aria-label={`${g.title} 삭제`}
                  className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-chalk/[0.06] cursor-pointer"
                  style={{ color: "var(--text-faint)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 생성 모달 ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="새 목표 추가">
        <div className="flex flex-col gap-5">
          <Field label="목표 제목">
            <input
              type="text"
              placeholder="예: 하루 스크린타임 2시간 이하로 줄이기"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={200}
              className={inputClass}
              style={inputStyle}
            />
          </Field>

          <Field label="하루 목표 스크린타임" hint={`현재 설정: ${fmt(form.targetMinutes)} 이하`}>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((min) => {
                const on = form.targetMinutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, targetMinutes: min }))}
                    className="h-8 px-3.5 rounded-full text-xs font-medium transition-colors cursor-pointer"
                    style={{
                      background: on ? "var(--accent-soft)" : "var(--bg-subtle)",
                      color: on ? "var(--color-bloom)" : "var(--text-muted)",
                      border: `1px solid ${on ? "rgba(61,219,135,0.3)" : "var(--border-card)"}`,
                    }}
                  >
                    {fmt(min)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.targetMinutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    targetMinutes: Math.max(1, Math.min(10080, parseInt(e.target.value) || 1)),
                  }))
                }
                min={1}
                max={10080}
                className={`${inputClass} num w-24 text-center`}
                style={{ ...inputStyle, letterSpacing: 0 }}
              />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                분 이하
              </span>
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="시작일">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label="종료일">
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
          </div>

          <ErrorNote>{formError}</ErrorNote>

          <Pill onClick={handleSubmit} disabled={submitting} variant="accent" className="w-full">
            {submitting ? "추가 중…" : "목표 추가"}
          </Pill>
        </div>
      </Modal>
    </AppShell>
  );
}
