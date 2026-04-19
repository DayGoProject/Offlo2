/* ── Phase 5: 차단 사이트 오버레이 ─────────────────────────
   chrome.storage.sync의 blockedDomains 목록과 현재 hostname을 비교.
   차단된 경우 전체 화면 오버레이를 표시한다.
   ────────────────────────────────────────────────────────── */

const hostname = window.location.hostname;

chrome.storage.sync.get(['blockedDomains'], (result) => {
  const blocked: string[] = result['blockedDomains'] ?? [];

  const isBlocked = blocked.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isBlocked) return;

  // 오늘 일시 해제된 도메인은 건너뜀
  chrome.storage.session?.get?.([`unblocked_${hostname}`], (r) => {
    if (r?.[`unblocked_${hostname}`]) return;
    injectOverlay();
  });
});

function injectOverlay(): void {
  // body가 없을 경우 대비
  const target = document.body ?? document.documentElement;

  /* 스타일 */
  const style = document.createElement('style');
  style.textContent = `
    #offlo-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: #0A0A0F;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, 'Segoe UI', sans-serif;
    }
    #offlo-overlay .inner { text-align: center; padding: 0 24px; }
    #offlo-overlay .logo  { color: #3DDB87; font-size: 28px; font-weight: 700; margin-bottom: 20px; }
    #offlo-overlay h1     { color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    #offlo-overlay .host  { color: rgba(255,255,255,0.4); font-size: 14px; margin-bottom: 32px; }
    #offlo-overlay .btns  { display: flex; gap: 10px; justify-content: center; }
    #offlo-back {
      padding: 11px 22px; border-radius: 999px; cursor: pointer;
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.12); font-size: 14px;
    }
    #offlo-unblock {
      padding: 11px 22px; border-radius: 999px; cursor: pointer;
      background: #3DDB87; color: #0A0A0F;
      border: none; font-size: 14px; font-weight: 600;
    }
  `;
  document.head.appendChild(style);

  /* 오버레이 */
  const overlay = document.createElement('div');
  overlay.id = 'offlo-overlay';
  overlay.innerHTML = `
    <div class="inner">
      <div class="logo">Offlo</div>
      <h1>이 사이트는 차단되었습니다</h1>
      <p class="host">${hostname}</p>
      <div class="btns">
        <button id="offlo-back">돌아가기</button>
        <button id="offlo-unblock">오늘 하루 해제</button>
      </div>
    </div>
  `;
  target.appendChild(overlay);

  document.getElementById('offlo-back')!.addEventListener('click', () => {
    history.length > 1 ? history.back() : window.close();
  });

  document.getElementById('offlo-unblock')!.addEventListener('click', () => {
    chrome.storage.session?.set?.({ [`unblocked_${hostname}`]: true });
    overlay.remove();
    style.remove();
  });
}
