/* ═══════════════════════════════════════════════════════════
   Offlo 확장 프로그램 — Content Script
   역할: 차단된 사이트 접근 시 오버레이 표시
   세션이 활성화된 상태 + 차단 목록에 있는 도메인일 때만 동작
   ═══════════════════════════════════════════════════════════ */

const hostname = window.location.hostname.replace(/^www\./, '');

/* ── 차단 여부 확인 및 오버레이 제어 ────────────────────── */

function checkAndBlock() {
  chrome.runtime.sendMessage({ type: 'CHECK_BLOCKED', hostname }, (res) => {
    if (chrome.runtime.lastError) return; // 확장 컨텍스트 무효 시 무시
    if (res?.blocked && res?.sessionActive) {
      if (!document.getElementById('offlo-overlay')) injectOverlay();
    }
  });
}

function removeOverlay() {
  document.getElementById('offlo-overlay')?.remove();
  document.getElementById('offlo-overlay-style')?.remove();
}

/* ── 세션 상태 변경 수신 ────────────────────────────────── */

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SESSION_CHANGED') return;
  if (message.active) {
    checkAndBlock();
  } else {
    removeOverlay();
  }
});

/* ── 오버레이 주입 ──────────────────────────────────────── */

function injectOverlay() {
  /* 스타일 */
  const style = document.createElement('style');
  style.id = 'offlo-overlay-style';
  style.textContent = `
    #offlo-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: #0A0A0F;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: -apple-system, 'Segoe UI', sans-serif;
      animation: offlo-fadein 0.3s ease;
    }
    @keyframes offlo-fadein { from { opacity: 0 } to { opacity: 1 } }

    #offlo-overlay .offlo-logo {
      color: #3DDB87; font-size: 28px; font-weight: 700;
      letter-spacing: -0.5px; margin-bottom: 32px;
    }
    #offlo-overlay .offlo-icon {
      font-size: 56px; margin-bottom: 20px;
    }
    #offlo-overlay h1 {
      color: #fff; font-size: 22px; font-weight: 600;
      margin: 0 0 10px; text-align: center;
    }
    #offlo-overlay .offlo-host {
      color: rgba(255,255,255,0.35); font-size: 14px;
      margin: 0 0 36px;
    }
    #offlo-overlay .offlo-btns {
      display: flex; gap: 12px;
    }
    #offlo-back {
      padding: 12px 24px; border-radius: 999px; cursor: pointer;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.65); font-size: 14px;
      transition: background 0.2s;
    }
    #offlo-back:hover { background: rgba(255,255,255,0.12); }
    #offlo-unblock {
      padding: 12px 24px; border-radius: 999px; cursor: pointer;
      background: rgba(61,219,135,0.12);
      border: 1px solid rgba(61,219,135,0.3);
      color: #3DDB87; font-size: 14px; font-weight: 600;
      transition: background 0.2s;
    }
    #offlo-unblock:hover { background: rgba(61,219,135,0.2); }
    #offlo-overlay .offlo-tip {
      margin-top: 28px;
      color: rgba(255,255,255,0.2); font-size: 12px; text-align: center;
      line-height: 1.6;
    }
  `;
  document.head.appendChild(style);

  /* 오버레이 DOM */
  const overlay = document.createElement('div');
  overlay.id = 'offlo-overlay';
  overlay.innerHTML = `
    <div class="offlo-logo">Offlo</div>
    <div class="offlo-icon">🌱</div>
    <h1>차단된 사이트입니다</h1>
    <p class="offlo-host">${window.location.hostname}</p>
    <div class="offlo-btns">
      <button id="offlo-back">돌아가기</button>
      <button id="offlo-unblock">이 세션만 해제</button>
    </div>
    <p class="offlo-tip">
      디톡스 세션 중입니다.<br>
      세션을 완료하면 반려 식물에 시간이 적립돼요.
    </p>
  `;

  // body가 아직 없는 경우 대비
  const target = document.body ?? document.documentElement;
  target.appendChild(overlay);

  /* 이벤트 */
  document.getElementById('offlo-back')!.addEventListener('click', () => {
    history.length > 1 ? history.back() : window.close();
  });

  document.getElementById('offlo-unblock')!.addEventListener('click', () => {
    // 이 세션 동안만 이 탭에서 차단 해제 (영구 차단 목록은 유지)
    removeOverlay();
  });
}

/* ── 최초 실행 ──────────────────────────────────────────── */

checkAndBlock();
