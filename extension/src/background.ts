/**
 * Offlo Extension — Background Service Worker
 * 역할: 활성 탭 변경 감지 → 도메인별 체류 시간 chrome.storage.local에 누적
 */

import { getDomain, getToday, isDistracting } from "./types";

interface StoredStats {
  date: string;
  sites: Record<string, number>;
  lastSyncedDetoxSeconds: number;
}

// ── 현재 추적 상태 ──────────────────────────────────────────────
let activeTabId: number | null = null;
let activeUrl: string | null = null;
let activeStart: number | null = null;   // Date.now()
let windowFocused = true;

// ── 스토리지 헬퍼 ───────────────────────────────────────────────
async function loadStats(): Promise<StoredStats> {
  const today = getToday();
  const result = await chrome.storage.local.get("stats");
  const stats = result.stats as StoredStats | undefined;
  if (!stats || stats.date !== today) {
    const fresh: StoredStats = { date: today, sites: {}, lastSyncedDetoxSeconds: 0 };
    await chrome.storage.local.set({ stats: fresh });
    return fresh;
  }
  return stats;
}

async function addTime(domain: string, seconds: number): Promise<void> {
  if (seconds <= 0) return;
  const stats = await loadStats();
  stats.sites[domain] = (stats.sites[domain] ?? 0) + seconds;
  await chrome.storage.local.set({ stats });
}

// ── 경과 시간 기록 ───────────────────────────────────────────────
async function recordElapsed(): Promise<void> {
  if (!activeUrl || !activeStart || !windowFocused) return;
  const domain = getDomain(activeUrl);
  if (!domain) return;
  const elapsed = Math.floor((Date.now() - activeStart) / 1000);
  activeStart = Date.now();
  if (elapsed > 0) await addTime(domain, elapsed);
}

// ── 탭 활성화 ────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await recordElapsed();
  try {
    const tab = await chrome.tabs.get(tabId);
    activeTabId = tabId;
    activeUrl = tab.url ?? null;
    activeStart = Date.now();
  } catch {
    activeTabId = null;
    activeUrl = null;
    activeStart = null;
  }
});

// ── 탭 URL 변경 ─────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (tabId !== activeTabId || !changeInfo.url) return;
  await recordElapsed();
  activeUrl = changeInfo.url;
  activeStart = Date.now();
});

// ── 탭 닫힘 ────────────────────────────────────────────────────
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId !== activeTabId) return;
  await recordElapsed();
  activeTabId = null;
  activeUrl = null;
  activeStart = null;
});

// ── 창 포커스 ────────────────────────────────────────────────────
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await recordElapsed();
    windowFocused = false;
    activeStart = null;
  } else {
    windowFocused = true;
    activeStart = Date.now();
    // 현재 활성 탭 감지
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab?.id) {
        activeTabId = tab.id;
        activeUrl = tab.url ?? null;
      }
    } catch { /* ignore */ }
  }
});

// ── 아이들 감지 ─────────────────────────────────────────────────
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "idle" || state === "locked") {
    await recordElapsed();
    windowFocused = false;
    activeStart = null;
  } else {
    windowFocused = true;
    activeStart = Date.now();
  }
});

// ── 1분마다 경과 시간 저장 ────────────────────────────────────────
chrome.alarms.create("persist", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "persist") await recordElapsed();
});

// ── 서비스워커 초기화: 현재 활성 탭 감지 ────────────────────────
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      activeTabId = tab.id;
      activeUrl = tab.url ?? null;
      activeStart = Date.now();
    }
  } catch { /* ignore */ }
})();

// Prevent TypeScript from complaining about top-level in non-module
export {};
