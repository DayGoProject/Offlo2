/* ═══════════════════════════════════════════════════════════
   Offlo 확장 프로그램 — Popup UI
   ═══════════════════════════════════════════════════════════ */

/* ── 타입 ────────────────────────────────────────────────── */

interface Session {
  active: boolean;
  startTime: number;
  endTime: number;
  durationMs: number;
}

interface State {
  loggedIn: boolean;
  session: Session | null;
  blockedDomains: string[];
  todaySeconds: number;
}

/* ── 유틸 ────────────────────────────────────────────────── */

function formatDetoxTime(seconds: number): string {
  if (seconds <= 0) return '0분';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00:00';
  const t = Math.floor(remainingMs / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function getState(): Promise<State> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, resolve);
  });
}

/* ── 카운트다운 타이머 ───────────────────────────────────── */

let timerInterval: ReturnType<typeof setInterval> | null = null;

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function startCountdown(session: Session) {
  clearTimer();
  timerInterval = setInterval(() => {
    const el = document.getElementById('countdown');
    if (!el) { clearTimer(); return; }
    const remaining = session.endTime - Date.now();
    if (remaining <= 0) { clearTimer(); init(); return; }
    el.textContent = formatCountdown(remaining);
  }, 1000);
}

/* ── 렌더: 로그인 화면 ──────────────────────────────────── */

function renderLogin() {
  clearTimer();
  document.getElementById('app')!.innerHTML = `
    <div class="header">
      <span class="logo">Offlo</span>
    </div>
    <div class="login-section">
      <p class="login-desc">
        Offlo 계정으로 로그인하면<br>
        사이트를 차단하고 디톡스 시간을<br>
        반려 식물에 적립할 수 있어요.
      </p>
      <button id="loginBtn" class="btn-primary">Google로 로그인</button>
    </div>
  `;
  document.getElementById('loginBtn')!.addEventListener('click', () => {
    const url = `https://offlo--offlo2-app.asia-east1.hosted.app/extension-auth?extensionId=${chrome.runtime.id}`;
    chrome.tabs.create({ url });
    window.close();
  });
}

/* ── 렌더: 메인 화면 ────────────────────────────────────── */

function renderMain(state: State) {
  clearTimer();
  const { blockedDomains, session, todaySeconds } = state;

  /* 차단 사이트 목록 */
  const domainRows = blockedDomains.length > 0
    ? blockedDomains.map(d => `
        <div class="domain-item">
          <span class="domain-text">${d}</span>
          <button class="btn-remove" data-domain="${d}" title="삭제">×</button>
        </div>`).join('')
    : `<p class="empty-msg">차단할 사이트를 추가해주세요.</p>`;

  /* 세션 영역 */
  const sessionHtml = session?.active
    ? `<div class="session-active">
        <div class="pulse-dot"></div>
        <div class="session-info">
          <span class="session-title">디톡스 진행 중</span>
          <span id="countdown" class="countdown">${formatCountdown(session.endTime - Date.now())}</span>
        </div>
        <button id="stopBtn" class="btn-stop">중단</button>
      </div>`
    : `<div class="session-idle">
        <p class="session-guide">차단 시간을 선택하세요</p>
        <div class="duration-grid">
          <button class="btn-dur" data-ms="${30 * 60 * 1000}">30분</button>
          <button class="btn-dur" data-ms="${60 * 60 * 1000}">1시간</button>
          <button class="btn-dur" data-ms="${90 * 60 * 1000}">1시간 30분</button>
          <button class="btn-dur" data-ms="${120 * 60 * 1000}">2시간</button>
        </div>
        <div class="custom-row">
          <input id="customMin" type="number" min="1" max="480" placeholder="직접 입력 (분)" class="input-custom" />
          <button id="startCustomBtn" class="btn-primary-sm">시작</button>
        </div>
      </div>`;

  document.getElementById('app')!.innerHTML = `
    <div class="header">
      <span class="logo">Offlo</span>
      <button id="logoutBtn" class="btn-ghost">로그아웃</button>
    </div>

    <section class="section">
      <div class="section-title">차단 사이트</div>
      <div id="domainList" class="domain-list">${domainRows}</div>
      <div class="add-row">
        <input id="domainInput" type="text" placeholder="youtube.com" class="input-domain" />
        <button id="addBtn" class="btn-add">추가</button>
      </div>
    </section>

    <section class="section">
      <div class="section-title">디톡스 세션</div>
      ${sessionHtml}
    </section>

    <div class="today-bar">
      <span class="today-label">오늘 적립한 디톡스</span>
      <span class="today-value">${formatDetoxTime(todaySeconds)}</span>
    </div>
  `;

  /* ── 이벤트 바인딩 ── */

  // 도메인 삭제
  document.getElementById('domainList')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.btn-remove');
    if (!btn) return;
    chrome.runtime.sendMessage({ type: 'REMOVE_DOMAIN', domain: btn.dataset.domain }, () => init());
  });

  // 도메인 추가
  const handleAdd = () => {
    const input = document.getElementById('domainInput') as HTMLInputElement;
    const domain = input.value.trim();
    if (!domain) return;
    chrome.runtime.sendMessage({ type: 'ADD_DOMAIN', domain }, () => {
      input.value = '';
      init();
    });
  };
  document.getElementById('addBtn')!.addEventListener('click', handleAdd);
  (document.getElementById('domainInput') as HTMLInputElement)
    .addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

  // 세션 시작 (프리셋)
  document.querySelectorAll<HTMLElement>('.btn-dur').forEach(btn => {
    btn.addEventListener('click', () => {
      if (blockedDomains.length === 0) {
        showToast('차단할 사이트를 먼저 추가해주세요.');
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'START_SESSION', durationMs: parseInt(btn.dataset.ms!) },
        () => init()
      );
    });
  });

  // 세션 시작 (직접 입력)
  document.getElementById('startCustomBtn')?.addEventListener('click', () => {
    const min = parseInt((document.getElementById('customMin') as HTMLInputElement).value);
    if (!min || min < 1) { showToast('시간을 입력해주세요.'); return; }
    if (blockedDomains.length === 0) { showToast('차단할 사이트를 먼저 추가해주세요.'); return; }
    chrome.runtime.sendMessage({ type: 'START_SESSION', durationMs: min * 60 * 1000 }, () => init());
  });

  // 세션 중단
  document.getElementById('stopBtn')?.addEventListener('click', () => {
    if (!confirm('세션을 중단하면 이번 세션의 디톡스 시간이 적립되지 않습니다.\n정말 중단할까요?')) return;
    chrome.runtime.sendMessage({ type: 'STOP_SESSION' }, () => init());
  });

  // 로그아웃
  document.getElementById('logoutBtn')!.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => renderLogin());
  });

  // 카운트다운 시작
  if (session?.active) startCountdown(session);
}

/* ── 토스트 메시지 ──────────────────────────────────────── */

function showToast(msg: string) {
  const existing = document.getElementById('toast');
  existing?.remove();
  const el = document.createElement('div');
  el.id = 'toast';
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

/* ── 초기화 ─────────────────────────────────────────────── */

async function init() {
  const state = await getState();
  if (!state?.loggedIn) {
    renderLogin();
  } else {
    renderMain(state);
  }
}

document.addEventListener('DOMContentLoaded', init);
