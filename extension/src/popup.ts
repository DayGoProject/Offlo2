/* ── 타입 ───────────────────────────────────────────────── */

interface DayData {
  date: string;
  domains: Record<string, number>; // domain → seconds
}

/* ── 도메인 → 앱 이름 매핑 ──────────────────────────────── */

const DOMAIN_NAMES: Record<string, string> = {
  'www.youtube.com': '유튜브',
  'youtube.com': '유튜브',
  'www.instagram.com': '인스타그램',
  'instagram.com': '인스타그램',
  'twitter.com': '트위터',
  'x.com': '트위터(X)',
  'www.facebook.com': '페이스북',
  'facebook.com': '페이스북',
  'www.tiktok.com': '틱톡',
  'tiktok.com': '틱톡',
  'www.netflix.com': '넷플릭스',
  'netflix.com': '넷플릭스',
  'www.naver.com': '네이버',
  'naver.com': '네이버',
  'www.kakao.com': '카카오',
  'www.reddit.com': '레딧',
  'www.twitch.tv': '트위치',
  'twitch.tv': '트위치',
};

/* ── 유틸 ───────────────────────────────────────────────── */

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return '1분 미만';
}

function displayName(domain: string): string {
  return DOMAIN_NAMES[domain] ?? domain.replace(/^www\./, '');
}

/* ── 인증 체크 ───────────────────────────────────────────── */

async function checkAuth(): Promise<{ idToken: string | null; expired: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['idToken', 'expiresAt'], (result) => {
      const { idToken, expiresAt } = result as { idToken?: string; expiresAt?: number };
      if (!idToken) return resolve({ idToken: null, expired: false });
      if (expiresAt && Date.now() > expiresAt) return resolve({ idToken: null, expired: true });
      resolve({ idToken, expired: false });
    });
  });
}

async function getTodayData(): Promise<DayData> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TODAY_DATA' }, (response) => {
      const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      resolve(response?.data ?? { date: today, domains: {} });
    });
  });
}

/* ── 렌더: 로그인 화면 ──────────────────────────────────── */

function renderLogin(expired: boolean): void {
  document.getElementById('app')!.innerHTML = `
    <div class="header">
      <span class="logo">Offlo</span>
    </div>
    <div class="login-section">
      ${expired ? '<p class="error-msg">로그인이 만료되었습니다.</p>' : ''}
      <p class="desc">Offlo 계정으로 로그인하면<br>웹 사용 시간이 자동으로 기록됩니다.</p>
      <button id="loginBtn" class="btn-primary">Google로 로그인</button>
    </div>
  `;

  document.getElementById('loginBtn')!.addEventListener('click', () => {
    const extensionId = chrome.runtime.id;
    const url = `https://offlo--offlo2-app.asia-east1.hosted.app/extension-auth?extensionId=${extensionId}`;
    chrome.tabs.create({ url });
    window.close();
  });
}

/* ── 렌더: 대시보드 ─────────────────────────────────────── */

function renderDashboard(data: DayData): void {
  const entries = Object.entries(data.domains)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const totalSeconds = Object.values(data.domains).reduce((a, b) => a + b, 0);

  const rows = entries.length > 0
    ? entries.map(([domain, seconds]) => {
        const pct = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0;
        return `
          <div class="domain-row">
            <span class="domain-name">${displayName(domain)}</span>
            <div class="bar-wrap">
              <div class="bar" style="width:${Math.max(pct, 2)}%"></div>
            </div>
            <span class="domain-time">${formatTime(seconds)}</span>
          </div>`;
      }).join('')
    : '<p class="no-data">아직 기록된 데이터가 없습니다.</p>';

  document.getElementById('app')!.innerHTML = `
    <div class="header">
      <span class="logo">Offlo</span>
      <button id="logoutBtn" class="btn-ghost">로그아웃</button>
    </div>
    <div class="total-card">
      <span class="total-label">오늘 총 사용 시간</span>
      <span class="total-time">${formatTime(totalSeconds)}</span>
    </div>
    <div class="domains-section">${rows}</div>
    <a id="analysisLink" class="btn-primary">분석하러 가기 →</a>
  `;

  document.getElementById('logoutBtn')!.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => renderLogin(false));
  });

  document.getElementById('analysisLink')!.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://offlo--offlo2-app.asia-east1.hosted.app/analysis' });
  });
}

/* ── 초기화 ─────────────────────────────────────────────── */

async function init(): Promise<void> {
  const { idToken, expired } = await checkAuth();
  if (!idToken) {
    renderLogin(expired);
    return;
  }
  const data = await getTodayData();
  renderDashboard(data);
}

document.addEventListener('DOMContentLoaded', init);
