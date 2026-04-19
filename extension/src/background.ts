/* ── 타입 ───────────────────────────────────────────────── */

interface DayData {
  date: string;
  domains: Record<string, number>; // domain → 누적 초(seconds)
}

interface TrackerState {
  currentDomain: string | null;
  startTime: number | null;      // Date.now()
  windowFocused: boolean;
}

/* ── 트래커 상태 ─────────────────────────────────────────── */

const state: TrackerState = {
  currentDomain: null,
  startTime: null,
  windowFocused: true,
};

/* ── 유틸 ───────────────────────────────────────────────── */

function getTodayKST(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10); // "2026-04-19"
}

function getDomain(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname;
  } catch {
    return null;
  }
}

/* ── 시간 저장 ───────────────────────────────────────────── */

async function saveTick(): Promise<void> {
  if (!state.currentDomain || !state.startTime || !state.windowFocused) return;

  const now = Date.now();
  const elapsed = Math.floor((now - state.startTime) / 1000);
  state.startTime = now;
  if (elapsed <= 0) return;

  const key = `day_${getTodayKST()}`;
  const result = await chrome.storage.local.get(key);
  const dayData: DayData = result[key] ?? { date: getTodayKST(), domains: {} };
  dayData.domains[state.currentDomain] = (dayData.domains[state.currentDomain] ?? 0) + elapsed;
  await chrome.storage.local.set({ [key]: dayData });
}

async function switchDomain(url?: string): Promise<void> {
  await saveTick();
  state.currentDomain = url ? getDomain(url) : null;
  state.startTime = state.currentDomain ? Date.now() : null;
}

/* ── 탭 이벤트 ───────────────────────────────────────────── */

chrome.tabs.onActivated.addListener(async (info) => {
  const tab = await chrome.tabs.get(info.tabId);
  await switchDomain(tab.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id === tabId) await switchDomain(tab.url);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await saveTick();
    state.windowFocused = false;
    state.startTime = null;
  } else {
    state.windowFocused = true;
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.currentDomain = active?.url ? getDomain(active.url) : null;
    state.startTime = state.currentDomain ? Date.now() : null;
  }
});

/* ── 1분마다 저장 ────────────────────────────────────────── */

chrome.alarms.create('tick', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'tick') await saveTick();
});

/* ── Phase 4: 웹앱 → 확장 토큰 수신 ─────────────────────── */
// /extension-auth 페이지에서 chrome.runtime.sendMessage(extensionId, ...) 로 전송

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AUTH_SUCCESS' && typeof message.idToken === 'string') {
    const expiresAt = Date.now() + 55 * 60 * 1000; // 55분 후 만료
    chrome.storage.local
      .set({ idToken: message.idToken, expiresAt })
      .then(() => sendResponse({ success: true }));
    return true; // async
  }
});

/* ── 팝업 ↔ background 메시지 ────────────────────────────── */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 오늘 사용 데이터 조회
  if (message?.type === 'GET_TODAY_DATA') {
    const key = `day_${getTodayKST()}`;
    chrome.storage.local.get(key).then((result) => {
      sendResponse({ data: result[key] ?? { date: getTodayKST(), domains: {} } });
    });
    return true;
  }

  // 로그아웃
  if (message?.type === 'LOGOUT') {
    chrome.storage.local.remove(['idToken', 'expiresAt']).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});
