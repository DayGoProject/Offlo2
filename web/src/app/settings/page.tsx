"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import Field, { ErrorNote, inputStyle } from "@/components/app/Field";

/* 회원 탈퇴 확인 문구 — 화면 안내와 검증이 같은 상수를 봐야 어긋나지 않는다 */
const DELETE_PHRASE = "탈퇴";

/* 입력면은 카드보다 한 단계 밝은 --bg-nav를 쓴다. 설정은 카드 안에 입력이
   많아서, 카드와 같은 색이면 입력 칸의 경계가 사라진다. */
const fieldStyle: React.CSSProperties = { ...inputStyle, background: "var(--bg-nav)" };
const fieldClass =
  "w-full h-11 px-4 rounded-[9px] text-sm outline-none transition-colors focus:border-[color:var(--color-bloom)]";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="flex flex-col gap-[18px] w-full px-[22px] sm:px-7 py-6 rounded-card"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function OkNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="text-xs leading-4 px-3 py-2.5 rounded-lg"
      style={{ color: "var(--color-bloom)", background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.2)" }}
    >
      {children}
    </p>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [nameError, setNameError] = useState("");
  const [plan, setPlan] = useState("무료");

  /* 비밀번호 변경 상태 */
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  /* 회원 탈퇴 상태 */
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteReauth, setDeleteReauth] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    // 플랜은 ID 토큰 클레임에서 읽는다 — 캐시된 토큰이라 네트워크 요청이 없다
    user
      .getIdTokenResult()
      .then((r) => setPlan(r.claims.premium ? "프리미엄" : "무료"))
      .catch(() => {});
  }, [user]);

  if (authLoading || !user) return null;

  const initials = (user.displayName ?? user.email ?? "?").charAt(0).toUpperCase();
  const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
  const isEmailUser = user.providerData.some((p) => p.providerId === "password");
  const nameDirty = !!displayName.trim() && displayName.trim() !== user.displayName;

  async function handleSaveName() {
    if (!user || !nameDirty) return;
    setSaving(true);
    setNameError("");
    setSavedMsg("");
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      const token = await user.getIdToken();
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user.email ?? "", name: displayName.trim() }),
      });
      setSavedMsg("이름이 저장됐습니다.");
    } catch {
      setNameError("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setPwError("");
    setPwMsg("");
    if (newPw.length < 8) return setPwError("새 비밀번호는 8자 이상이어야 합니다.");
    if (newPw !== confirmPw) return setPwError("새 비밀번호가 일치하지 않습니다.");

    setPwSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setPwMsg("비밀번호가 변경됐습니다.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setPwError(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "현재 비밀번호가 올바르지 않습니다."
          : "비밀번호 변경 중 오류가 발생했습니다.",
      );
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user || deleteConfirm.trim() !== DELETE_PHRASE) return;
    setDeleting(true);
    setDeleteError("");
    try {
      /* 이메일 유저는 재인증 필요 */
      if (isEmailUser && user.email) {
        const cred = EmailAuthProvider.credential(user.email, deleteReauth);
        await reauthenticateWithCredential(user, cred);
      }
      /* Supabase + Firestore 삭제 */
      const token = await user.getIdToken();
      await fetch("/api/users/me", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      /* Firebase Auth 삭제 */
      await deleteUser(user);
      router.replace("/");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setDeleteError(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "비밀번호가 올바르지 않습니다."
          : "계정 삭제 중 오류가 발생했습니다. 다시 시도해주세요.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="계정 · 보안"
        title="설정"
        actions={
          <Pill onClick={handleSaveName} disabled={!nameDirty || saving} variant="primary">
            {saving ? "저장 중…" : "변경사항 저장"}
          </Pill>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4 w-full items-start">
        {/* ── 좌: 프로필 · 비밀번호 ── */}
        <div className="flex flex-col gap-3.5 w-full lg:flex-1 min-w-0">
          <Panel title="프로필">
            <div className="flex items-center gap-4 w-full">
              <span
                className="flex items-center justify-center w-14 h-14 rounded-full shrink-0 overflow-hidden"
                style={{ background: "var(--accent-soft)" }}
              >
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="num text-xl" style={{ color: "var(--color-bloom)", fontWeight: 600, letterSpacing: 0 }}>
                    {initials}
                  </span>
                )}
              </span>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <p className="text-[15px] leading-[18px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {user.displayName ?? "이름 없음"}
                </p>
                <p className="num text-xs leading-4 truncate" style={{ color: "var(--text-muted)", letterSpacing: 0 }}>
                  {user.email}
                </p>
              </div>
              <span
                className="flex items-center h-6 px-[11px] rounded-full text-[11px] leading-[14px] font-semibold shrink-0"
                style={{ background: "var(--accent-soft)", color: "var(--color-bloom)" }}
              >
                {isGoogle ? "Google" : "이메일"}
              </span>
            </div>

            <Field label="이름" hint="커뮤니티 피드와 랭킹에 이 이름이 공개됩니다">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                placeholder="이름을 입력하세요"
                className={fieldClass}
                style={fieldStyle}
              />
            </Field>

            <ErrorNote>{nameError}</ErrorNote>
            <OkNote>{savedMsg}</OkNote>
          </Panel>

          <Panel title="비밀번호 변경">
            {isEmailUser ? (
              <form onSubmit={handleChangePw} className="flex flex-col gap-3">
                {[
                  { label: "현재 비밀번호", val: currentPw, set: setCurrentPw, ph: "현재 비밀번호를 입력하세요" },
                  { label: "새 비밀번호", val: newPw, set: setNewPw, ph: "새 비밀번호를 입력하세요 (8자 이상)" },
                  { label: "새 비밀번호 확인", val: confirmPw, set: setConfirmPw, ph: "새 비밀번호를 한 번 더 입력하세요" },
                ].map(({ label, val, set, ph }) => (
                  <input
                    key={label}
                    type="password"
                    aria-label={label}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    className={fieldClass}
                    style={fieldStyle}
                  />
                ))}

                <ErrorNote>{pwError}</ErrorNote>
                <OkNote>{pwMsg}</OkNote>

                <Pill type="submit" variant="accent" disabled={pwSaving || !currentPw || !newPw || !confirmPw}>
                  {pwSaving ? "변경 중…" : "비밀번호 변경"}
                </Pill>
              </form>
            ) : (
              <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-muted)" }}>
                Google 계정으로 가입해 비밀번호 변경이 필요 없습니다. 로그인 보안은 Google 계정 설정에서 관리하세요.
              </p>
            )}
          </Panel>
        </div>

        {/* ── 우: 계정 · 앱 정보 ── */}
        <div className="flex flex-col gap-3.5 w-full lg:w-[400px] shrink-0">
          <Panel title="계정">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-[9px] transition-opacity hover:opacity-75 cursor-pointer"
              style={{ background: "var(--bg-nav)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path
                  d="M10 11.4 13.4 8 10 4.6M13.4 8H6"
                  fill="none"
                  stroke="var(--text-primary)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 2.6H3.4A1.4 1.4 0 0 0 2 4v8a1.4 1.4 0 0 0 1.4 1.4H6"
                  fill="none"
                  stroke="var(--text-primary)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-sm leading-[18px] flex-1 text-left" style={{ color: "var(--text-primary)" }}>
                로그아웃
              </span>
            </button>

            <div
              className="flex flex-col gap-2.5 w-full px-[18px] py-4 rounded-[9px]"
              style={{ background: "var(--danger-soft)", border: "1px solid var(--danger-line)" }}
            >
              <p className="text-[13px] leading-4 font-semibold" style={{ color: "#FF8686" }}>
                회원 탈퇴
              </p>
              <p className="text-xs leading-[19px]" style={{ color: "var(--text-muted)" }}>
                분석 기록·목표·배지·반려 정원이 모두 삭제되며 복구할 수 없습니다.
              </p>

              {isEmailUser && (
                <input
                  type="password"
                  aria-label="현재 비밀번호 확인"
                  value={deleteReauth}
                  onChange={(e) => setDeleteReauth(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  className="w-full h-[38px] px-3.5 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg-nav)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
                />
              )}

              <input
                type="text"
                aria-label="탈퇴 확인 문구"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={`확인을 위해 "${DELETE_PHRASE}"를 입력하세요`}
                className="w-full h-[38px] px-3.5 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg-nav)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
              />

              {deleteError && (
                <p className="text-xs leading-4" style={{ color: "var(--danger)" }}>
                  {deleteError}
                </p>
              )}

              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm.trim() !== DELETE_PHRASE || (isEmailUser && !deleteReauth)}
                className="w-full h-[38px] rounded-full text-xs font-semibold transition-opacity hover:opacity-85 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "var(--danger)", color: "#FFFFFF" }}
              >
                {deleting ? "삭제 중…" : "영구 삭제"}
              </button>
            </div>
          </Panel>

          <Panel title="앱 정보">
            <div className="flex flex-col gap-3 w-full">
              {[
                { label: "버전", value: "1.0.0", num: true },
                { label: "플랜", value: plan, num: false },
                { label: "확장 프로그램", value: "Chrome 웹 스토어 준비 중", num: false },
              ].map(({ label, value, num }) => (
                <div key={label} className="flex items-center justify-between gap-3 w-full">
                  <span className="text-[13px] leading-4 shrink-0" style={{ color: "var(--text-muted)" }}>
                    {label}
                  </span>
                  <span
                    className={`text-[13px] leading-4 text-right ${num ? "num" : ""}`}
                    style={{ color: "var(--text-primary)", letterSpacing: num ? 0 : undefined }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
