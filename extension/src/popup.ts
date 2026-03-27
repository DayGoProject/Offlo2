/**
 * Offlo Extension — Popup
 * 역할: 로그인 / 오늘 사이트 사용 현황 / 반려식물 상태 표시 + Firestore 동기화
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";
import {
  getDomain,
  getToday,
  isDistracting,
  getPlantEmoji,
  getPlantLabel,
  calcLevel,
  formatSeconds,
  type DailyStats,
  type PlantData,
} from "./types";

// ── Firebase 초기화 ───────────────────────────────────────────────
const app = getApps()[0] ?? initializeApp(firebaseConfig);
const auth = getAuth(app);
const db  = getFirestore(app);

// ── DOM ──────────────────────────────────────────────────────────
const $app = document.getElementById("app")!;

// ── Firestore 동기화 ─────────────────────────────────────────────
async function syncToFirestore(uid: string, newDetoxSeconds: number): Promise<PlantData | null> {
  if (newDetoxSeconds <= 0) {
    const snap = await getDoc(doc(db, "users", uid, "garden", "plant"));
    return snap.exists() ? (snap.data() as PlantData) : null;
  }
  const newDetoxMinutes = Math.floor(newDetoxSeconds / 60);
  const ref = doc(db, "users", uid, "garden", "plant");
  const snap = await getDoc(ref);
  const prev = snap.exists() ? (snap.data() as PlantData) : { totalDetoxMinutes: 0, level: 1, lastUpdated: "" };
  const total = (prev.totalDetoxMinutes ?? 0) + newDetoxMinutes;
  const level = calcLevel(total);
  await setDoc(ref, {
    totalDetoxMinutes: increment(newDetoxMinutes),
    level,
    lastUpdated: serverTimestamp(),
  }, { merge: true });

  // 동기화 완료 표시
  const result = await chrome.storage.local.get("stats");
  const stats = result.stats as DailyStats | undefined;
  if (stats && stats.date === getToday()) {
    stats.lastSyncedDetoxSeconds = (stats.lastSyncedDetoxSeconds ?? 0) + newDetoxSeconds;
    await chrome.storage.local.set({ stats });
  }
  return { totalDetoxMinutes: total, level, lastUpdated: "" };
}

// ── 오늘 통계 로드 ───────────────────────────────────────────────
async function loadTodayStats(): Promise<{
  topSites: { domain: string; seconds: number; distracting: boolean }[];
  totalSeconds: number;
  distractingSeconds: number;
  detoxSeconds: number;
  newDetoxSeconds: number;
}> {
  const result = await chrome.storage.local.get("stats");
  const stats = result.stats as DailyStats | undefined;
  const today = getToday();

  if (!stats || stats.date !== today) {
    return { topSites: [], totalSeconds: 0, distractingSeconds: 0, detoxSeconds: 0, newDetoxSeconds: 0 };
  }

  const sites = stats.sites ?? {};
  const lastSynced = stats.lastSyncedDetoxSeconds ?? 0;

  let totalSeconds = 0;
  let distractingSeconds = 0;

  const list = Object.entries(sites).map(([domain, seconds]) => {
    totalSeconds += seconds;
    if (isDistracting(domain)) distractingSeconds += seconds;
    return { domain, seconds, distracting: isDistracting(domain) };
  });

  list.sort((a, b) => b.seconds - a.seconds);
  const detoxSeconds = Math.max(0, totalSeconds - distractingSeconds);
  const newDetoxSeconds = Math.max(0, detoxSeconds - lastSynced);

  return {
    topSites: list.slice(0, 6),
    totalSeconds,
    distractingSeconds,
    detoxSeconds,
    newDetoxSeconds,
  };
}

// ── 렌더: 로그인 화면 ────────────────────────────────────────────
function renderLogin(errorMsg = "") {
  $app.innerHTML = `
    <div class="header">
      <span class="logo">Offlo</span>
      <span class="tagline">디지털 디톡스</span>
    </div>
    <div class="section">
      <p class="hint">Offlo 계정으로 로그인하면<br/>반려식물이 함께 성장해요 🌱</p>
      <form id="loginForm" class="form">
        <input id="emailInput" class="input" type="email" placeholder="이메일" required autocomplete="email" />
        <input id="passwordInput" class="input" type="password" placeholder="비밀번호" required autocomplete="current-password" />
        ${errorMsg ? `<p class="error">${errorMsg}</p>` : ""}
        <button class="btn-primary" type="submit" id="loginBtn">로그인</button>
      </form>
    </div>
  `;
  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("emailInput") as HTMLInputElement).value;
    const password = (document.getElementById("passwordInput") as HTMLInputElement).value;
    const btn = document.getElementById("loginBtn") as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "로그인 중...";
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        renderLogin("이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.");
        return;
      }
    } catch {
      renderLogin("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  });
}

// ── 렌더: 대시보드 ───────────────────────────────────────────────
async function renderDashboard(user: User) {
  $app.innerHTML = `<div class="loading">불러오는 중...</div>`;

  const { topSites, totalSeconds, distractingSeconds, detoxSeconds, newDetoxSeconds } = await loadTodayStats();
  let plant: PlantData | null = null;
  try {
    plant = await syncToFirestore(user.uid, newDetoxSeconds);
  } catch { /* 오프라인 등 */ }

  const detoxMinutes = Math.floor(detoxSeconds / 60);
  const distractRatio = totalSeconds > 0 ? Math.round((distractingSeconds / totalSeconds) * 100) : 0;

  const plantEmoji = plant ? getPlantEmoji(plant.level) : "🌱";
  const plantLabel = plant ? getPlantLabel(plant.level) : "새싹";
  const totalDetox = plant?.totalDetoxMinutes ?? 0;
  const nextThresholds = [60, 300, 900];
  const nextTarget = nextThresholds.find(t => t > totalDetox) ?? null;

  $app.innerHTML = `
    <div class="header">
      <span class="logo">Offlo</span>
      <button class="btn-ghost" id="logoutBtn">로그아웃</button>
    </div>

    ${plant ? `
    <div class="plant-card">
      <div class="plant-emoji">${plantEmoji}</div>
      <div class="plant-info">
        <div class="plant-name">${plantLabel} <span class="lv">Lv.${plant.level}</span></div>
        <div class="plant-stat">총 디톡스 <strong>${totalDetox}분</strong></div>
        ${nextTarget ? `<div class="plant-next">다음 단계까지 ${nextTarget - totalDetox}분</div>` : `<div class="plant-next">최고 단계 달성! 🎉</div>`}
      </div>
    </div>
    ` : `
    <div class="plant-card">
      <div class="plant-emoji">🌱</div>
      <div class="plant-info">
        <div class="plant-name">반려식물</div>
        <div class="plant-stat">데이터 없음</div>
      </div>
    </div>
    `}

    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-val">${formatSeconds(totalSeconds)}</div>
        <div class="stat-label">오늘 총 사용</div>
      </div>
      <div class="stat-box green">
        <div class="stat-val">${formatSeconds(detoxSeconds)}</div>
        <div class="stat-label">디톡스 시간</div>
      </div>
      <div class="stat-box red">
        <div class="stat-val">${distractRatio}%</div>
        <div class="stat-label">집중 방해</div>
      </div>
    </div>

    ${topSites.length > 0 ? `
    <div class="section-title">오늘 방문 사이트</div>
    <div class="site-list">
      ${topSites.map(s => `
        <div class="site-row">
          <span class="site-dot ${s.distracting ? "red" : "green"}"></span>
          <span class="site-domain">${s.domain}</span>
          <span class="site-time">${formatSeconds(s.seconds)}</span>
        </div>
      `).join("")}
    </div>
    ` : `
    <div class="empty">아직 기록이 없어요.<br/>브라우저를 사용하면 자동으로 추적됩니다.</div>
    `}

    <div class="footer">
      <a class="link" href="https://offlo2-app.web.app/analysis" target="_blank">AI 스크린타임 분석 →</a>
    </div>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth);
  });
}

// ── 초기화 ───────────────────────────────────────────────────────
setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      renderDashboard(user);
    } else {
      renderLogin();
    }
  });
});
