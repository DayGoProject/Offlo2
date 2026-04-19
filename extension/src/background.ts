/* ═══════════════════════════════════════════════════════════
   Offlo 확장 프로그램 — Background Service Worker
   역할: 차단 목록 관리 · 세션 타이머 · Firestore 적립
   ═══════════════════════════════════════════════════════════ */

/* ── 타입 ────────────────────────────────────────────────── */

interface Session {
  active: boolean;
  startTime: number;
  endTime: number;
  durationMs: number;
}

interface DetoxRecord {
  date: string;        // KST "YYYY-MM-DD"
  totalSeconds: number;
}

/* ── 유틸 ────────────────────────────────────────────────── */

function getTodayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function normalizeDomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();
}

function isBlocked(hostname: string, blockedDomains: string[]): boolean {
  const clean = hostname.replace(/^www\./, '');
  return blockedDomains.some(d => clean === d || clean.endsWith(`.${d}`));
}

/* ── 인증 ────────────────────────────────────────────────── */

async function getAuth(): Promise<{ idToken: string | null; uid: string | null }> {
  const result = await chrome.storage.local.get(['idToken', 'expiresAt']);
  const { idToken, expiresAt } = result as { idToken?: string; expiresAt?: number };
  if (!idToken || (expiresAt && Date.now() > expiresAt)) return { idToken: null, uid: null };
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    return { idToken, uid: payload.user_id ?? payload.sub ?? null };
  } catch {
    return { idToken: null, uid: null };
  }
}

/* ── 세션 관리 ───────────────────────────────────────────── */

async function startSession(durationMs: number): Promise<void> {
  const now = Date.now();
  const session: Session = {
    active: true,
    startTime: now,
    endTime: now + durationMs,
    durationMs,
  };
  await chrome.storage.local.set({ session });
  chrome.alarms.create('session-end', { when: session.endTime });
  await notifyAllTabs({ type: 'SESSION_CHANGED', active: true });
}

async function endSession(completed: boolean): Promise<void> {
  const result = await chrome.storage.local.get('session');
  const session = result.session as Session | undefined;

  chrome.alarms.clear('session-end');
  await chrome.storage.local.remove('session');
  await notifyAllTabs({ type: 'SESSION_CHANGED', active: false });

  if (!completed || !session?.active) return;

  // 실제 경과 시간으로 계산 (일찍 끝났을 경우 대비)
  const actualMs = Math.min(Date.now() - session.startTime, session.durationMs);
  const actualSeconds = Math.floor(actualMs / 1000);
  await creditDetoxTime(actualSeconds);
}

/* ── 디톡스 시간 적립 ────────────────────────────────────── */

async function creditDetoxTime(seconds: number): Promise<void> {
  if (seconds <= 0) return;

  const today = getTodayKST();
  const result = await chrome.storage.local.get('detoxRecord');
  const record: DetoxRecord = (result.detoxRecord as DetoxRecord) ?? { date: today, totalSeconds: 0 };

  if (record.date !== today) {
    record.date = today;
    record.totalSeconds = 0;
  }
  record.totalSeconds += seconds;
  await chrome.storage.local.set({ detoxRecord: record });

  // Firestore에 적립 (분 단위)
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) await syncToFirestore(minutes);
}

/* ── Firestore 동기화 ────────────────────────────────────── */

async function syncToFirestore(addMinutes: number): Promise<void> {
  const { idToken, uid } = await getAuth();
  if (!idToken || !uid) return;

  const docUrl = `https://firestore.googleapis.com/v1/projects/offlo2-app/databases/(default)/documents/users/${uid}/garden/plant`;
  const headers = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };

  // 현재 값 조회
  let currentMinutes = 0;
  try {
    const res = await fetch(docUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      currentMinutes = parseInt(data.fields?.totalDetoxMinutes?.integerValue ?? '0', 10);
    }
  } catch { /* 문서가 없으면 0으로 시작 */ }

  const newMinutes = currentMinutes + addMinutes;

  // 업데이트
  await fetch(
    `${docUrl}?updateMask.fieldPaths=totalDetoxMinutes&updateMask.fieldPaths=lastUpdated`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          totalDetoxMinutes: { integerValue: String(newMinutes) },
          lastUpdated: { timestampValue: new Date().toISOString() },
        },
      }),
    }
  );
}

/* ── 탭 전체 알림 ────────────────────────────────────────── */

async function notifyAllTabs(message: object): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(tab =>
      tab.id
        ? chrome.tabs.sendMessage(tab.id, message).catch(() => {})
        : Promise.resolve()
    )
  );
}

/* ── 알람 (세션 자동 종료) ───────────────────────────────── */

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'session-end') {
    await endSession(true);
  }
});

/* ── 외부 메시지 (/extension-auth 페이지 → 확장) ────────── */

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AUTH_SUCCESS' && typeof message.idToken === 'string') {
    const expiresAt = Date.now() + 55 * 60 * 1000;
    chrome.storage.local
      .set({ idToken: message.idToken, expiresAt })
      .then(() => sendResponse({ success: true }));
    return true;
  }
});

/* ── 내부 메시지 (popup ↔ background, content ↔ background) */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = message?.type as string;

  /* 팝업: 전체 상태 조회 */
  if (type === 'GET_STATE') {
    Promise.all([
      chrome.storage.local.get(['idToken', 'expiresAt', 'session', 'detoxRecord']),
      chrome.storage.sync.get('blockedDomains'),
    ]).then(([local, sync]) => {
      const l = local as Record<string, unknown>;
      const { idToken, expiresAt, session, detoxRecord } = l as {
        idToken?: string; expiresAt?: number;
        session?: Session; detoxRecord?: DetoxRecord;
      };
      const blockedDomains: string[] = (sync as Record<string, unknown>).blockedDomains as string[] ?? [];
      const loggedIn = !!idToken && !(expiresAt && Date.now() > expiresAt);
      const today = getTodayKST();
      const todaySeconds = detoxRecord?.date === today ? detoxRecord.totalSeconds : 0;
      sendResponse({ loggedIn, session: session ?? null, blockedDomains, todaySeconds });
    });
    return true;
  }

  /* 팝업: 도메인 추가 */
  if (type === 'ADD_DOMAIN') {
    const domain = normalizeDomain(message.domain as string);
    if (!domain) { sendResponse({ success: false }); return true; }
    chrome.storage.sync.get('blockedDomains').then(result => {
      const domains: string[] = (result.blockedDomains as string[]) ?? [];
      if (!domains.includes(domain)) domains.push(domain);
      return chrome.storage.sync.set({ blockedDomains: domains });
    }).then(() => sendResponse({ success: true }));
    return true;
  }

  /* 팝업: 도메인 삭제 */
  if (type === 'REMOVE_DOMAIN') {
    chrome.storage.sync.get('blockedDomains').then(result => {
      const domains: string[] = (result.blockedDomains as string[]) ?? [];
      return chrome.storage.sync.set({ blockedDomains: domains.filter(d => d !== message.domain) });
    }).then(() => sendResponse({ success: true }));
    return true;
  }

  /* 팝업: 세션 시작 */
  if (type === 'START_SESSION') {
    startSession(message.durationMs as number).then(() => sendResponse({ success: true }));
    return true;
  }

  /* 팝업: 세션 중단 (적립 안 됨) */
  if (type === 'STOP_SESSION') {
    endSession(false).then(() => sendResponse({ success: true }));
    return true;
  }

  /* 팝업: 로그아웃 */
  if (type === 'LOGOUT') {
    endSession(false)
      .then(() => chrome.storage.local.remove(['idToken', 'expiresAt', 'detoxRecord']))
      .then(() => sendResponse({ success: true }));
    return true;
  }

  /* 콘텐츠 스크립트: 차단 여부 확인 */
  if (type === 'CHECK_BLOCKED') {
    Promise.all([
      chrome.storage.sync.get('blockedDomains'),
      chrome.storage.local.get('session'),
    ]).then(([sync, local]) => {
      const blockedDomains: string[] = (sync as Record<string, unknown>).blockedDomains as string[] ?? [];
      const session = (local as Record<string, unknown>).session as Session | undefined;
      sendResponse({
        blocked: isBlocked(message.hostname as string, blockedDomains),
        sessionActive: !!session?.active,
      });
    });
    return true;
  }
});
