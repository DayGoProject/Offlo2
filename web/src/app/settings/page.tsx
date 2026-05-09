"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import { useTheme } from "@/context/ThemeContext";
import AppSidebar from "@/components/AppSidebar";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) setDisplayName(user.displayName ?? "");
  }, [user]);

  if (authLoading || !user) return null;

  const initials = (user.displayName ?? user.email ?? "?").charAt(0).toUpperCase();
  const isGoogle = user.providerData.some((p) => p.providerId === "google.com");

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim() === user!.displayName) return;
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      await updateProfile(user!, { displayName: displayName.trim() });
      /* Supabase name도 동기화 */
      const token = await user!.getIdToken();
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user!.email ?? "", name: displayName.trim() }),
      });
      setSavedMsg("이름이 저장됐습니다.");
    } catch {
      setError("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="ml-56 flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* 헤더 */}
        <div
          className="flex items-center px-7 py-5 border-b"
          style={{ borderColor: "var(--border-card)" }}
        >
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              설정
            </h1>
          </div>
        </div>

        <div className="p-6 flex-1 max-w-xl space-y-6">

          {/* 프로필 */}
          <div>
            <SectionTitle>프로필</SectionTitle>
            <Card>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-brand text-xl font-bold">{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {user.displayName ?? "이름 없음"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {user.email}
                  </p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block"
                    style={{ background: "rgba(61,219,135,0.12)", color: "#3DDB87" }}
                  >
                    {isGoogle ? "Google 계정" : "이메일 계정"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveName} className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    이름
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={100}
                    placeholder="이름을 입력하세요"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-card)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {savedMsg && (
                  <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2">
                    {savedMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving || !displayName.trim() || displayName.trim() === user.displayName}
                  className="text-sm font-bold py-2 px-5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "#3DDB87", color: "#0A0A0F" }}
                >
                  {saving ? "저장 중..." : "이름 저장"}
                </button>
              </form>
            </Card>
          </div>

          {/* 화면 */}
          <div>
            <SectionTitle>화면</SectionTitle>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>테마</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    현재: {theme === "dark" ? "다크 모드" : "라이트 모드"}
                  </p>
                </div>
                <button
                  onClick={toggle}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all hover:opacity-80"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
                >
                  {theme === "dark" ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                      라이트로 전환
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                      다크로 전환
                    </>
                  )}
                </button>
              </div>
            </Card>
          </div>

          {/* 계정 */}
          <div>
            <SectionTitle>계정</SectionTitle>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>로그아웃</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    현재 기기에서 로그아웃합니다.
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm font-bold py-2 px-4 rounded-full transition-opacity hover:opacity-80"
                  style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
                >
                  로그아웃
                </button>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
