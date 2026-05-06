"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";

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

type Tab = "active" | "completed" | "all";

/* ── 유틸 ──────────────────────────────────────────────────────── */

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

function dday(endDateStr: string, status: string): string {
  if (status === "completed") return "완료";
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return "기간 초과";
  if (diff === 0) return "오늘 마감";
  return `D-${diff}`;
}

const STATUS_LABEL: Record<string, string> = { active: "진행 중", completed: "완료", paused: "일시정지" };
const STATUS_COLOR: Record<string, string> = {
  active: "#3DDB87",
  completed: "rgba(255,255,255,0.4)",
  paused: "rgba(255,200,0,0.7)",
};

const PRESETS = [30, 60, 90, 120, 180];

/* ── 목표 카드 ─────────────────────────────────────────────────── */

function GoalCard({
  goal,
  onComplete,
  onDelete,
}: {
  goal: Goal;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const color = STATUS_COLOR[goal.status];
  const ddayText = dday(goal.endDate, goal.status);
  const ddayExpired = ddayText === "기간 초과";

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {/* 제목 + 상태 배지 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-snug flex-1" style={{ color: "var(--text-primary)" }}>
          {goal.title}
        </h3>
        <span
          className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: `${color}18`,
            color,
            border: `1px solid ${color}30`,
          }}
        >
          {STATUS_LABEL[goal.status]}
        </span>
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs px-2.5 py-1 rounded-lg"
          style={{ background: "rgba(61,219,135,0.08)", color: "#3DDB87" }}
        >
          {fmt(goal.targetMinutes)} 이하/일
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {fmtDate(goal.startDate)} ~ {fmtDate(goal.endDate)}
        </span>
        <span
          className="text-xs font-semibold ml-auto"
          style={{ color: ddayExpired ? "rgba(255,100,100,0.6)" : goal.status === "completed" ? "var(--text-muted)" : "#3DDB87" }}
        >
          {ddayText}
        </span>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-1">
        {goal.status === "active" && (
          <button
            onClick={() => onComplete(goal.id)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{
              background: "rgba(61,219,135,0.1)",
              color: "#3DDB87",
              border: "1px solid rgba(61,219,135,0.2)",
            }}
          >
            완료 처리
          </button>
        )}
        <button
          onClick={() => onDelete(goal.id)}
          className={`${goal.status === "active" ? "" : "flex-1"} py-2 px-4 rounded-xl text-xs font-semibold transition-all hover:opacity-80`}
          style={{
            background: "rgba(248,113,113,0.08)",
            color: "rgba(248,113,113,0.7)",
            border: "1px solid rgba(248,113,113,0.15)",
          }}
        >
          삭제
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
  const [tab, setTab] = useState<Tab>("active");

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
      const token = await user.getIdToken();
      const res = await fetch("/api/goals", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setGoals((await res.json()).goals ?? []);
      setLoading(false);
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
    if (res.ok) setGoals((prev) => prev.map((g) => g.id === id ? { ...g, status: "completed" } : g));
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
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    setForm({ title: "", targetMinutes: 60, startDate: today, endDate: nextWeek });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!user) return;
    setFormError("");

    if (!form.title.trim()) { setFormError("제목을 입력해주세요."); return; }
    if (!form.startDate || !form.endDate) { setFormError("기간을 설정해주세요."); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError("종료일은 시작일 이후여야 합니다.");
      return;
    }

    setSubmitting(true);
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
      setTab("active");
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error ?? "목표 생성에 실패했습니다.");
    }
    setSubmitting(false);
  }

  if (authLoading || !user) return null;

  const filtered = goals.filter((g) => tab === "all" || g.status === tab);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "active",    label: "진행 중",  count: goals.filter((g) => g.status === "active").length },
    { key: "completed", label: "완료",     count: goals.filter((g) => g.status === "completed").length },
    { key: "all",       label: "전체",     count: goals.length },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="ml-56 flex-1 flex flex-col min-h-screen">

        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-8 py-6 border-b"
          style={{ borderColor: "var(--border-card)" }}
        >
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>목표 관리</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              스크린타임 감소 목표를 설정하고 관리하세요
            </p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-opacity hover:opacity-85"
            style={{ background: "#3DDB87", color: "#0A0A0F" }}
          >
            <span className="text-base leading-none">+</span> 새 목표 추가
          </button>
        </div>

        {/* 탭 */}
        <div className="flex items-center gap-2 px-8 pt-6">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: tab === key ? "#3DDB87" : "transparent",
                color: tab === key ? "#0A0A0F" : "var(--text-muted)",
                border: tab === key ? "none" : "1px solid var(--border-card)",
              }}
            >
              {label} {count}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="px-8 py-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <span className="text-5xl">🎯</span>
              <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>
                {tab === "active" ? "진행 중인 목표가 없어요" : tab === "completed" ? "완료된 목표가 없어요" : "등록된 목표가 없어요"}
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                새 목표를 추가해서 디지털 디톡스를 시작해보세요
              </p>
              {tab !== "completed" && (
                <button
                  onClick={openModal}
                  className="mt-2 px-5 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-85"
                  style={{ background: "#3DDB87", color: "#0A0A0F" }}
                >
                  목표 추가하기
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {filtered.map((g) => (
                <GoalCard key={g.id} goal={g} onComplete={handleComplete} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 생성 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-extrabold" style={{ color: "var(--text-primary)" }}>새 목표 추가</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors hover:bg-white/[0.06]"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* 제목 */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  목표 제목
                </label>
                <input
                  type="text"
                  placeholder="예: 하루 스크린타임 2시간 이하로 줄이기"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-card)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* 하루 목표 스크린타임 */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  하루 목표 스크린타임
                </label>
                <div className="flex gap-2 flex-wrap mb-2.5">
                  {PRESETS.map((min) => (
                    <button
                      key={min}
                      onClick={() => setForm((f) => ({ ...f, targetMinutes: min }))}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: form.targetMinutes === min ? "#3DDB87" : "var(--bg-subtle)",
                        color: form.targetMinutes === min ? "#0A0A0F" : "var(--text-secondary)",
                        border: `1px solid ${form.targetMinutes === min ? "#3DDB87" : "var(--border-card)"}`,
                      }}
                    >
                      {fmt(min)}
                    </button>
                  ))}
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
                    className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-center"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-card)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>분 이하</span>
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                    ({fmt(form.targetMinutes)})
                  </span>
                </div>
              </div>

              {/* 기간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    시작일
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-card)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    종료일
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-card)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs" style={{ color: "#f87171" }}>{formError}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "#3DDB87", color: "#0A0A0F" }}
              >
                {submitting ? "추가 중..." : "목표 추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
