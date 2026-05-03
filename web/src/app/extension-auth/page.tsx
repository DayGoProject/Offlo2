'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/services/firebase';

/* ── 실제 로직 컴포넌트 ─────────────────────────────────── */

function ExtensionAuthContent() {
  const searchParams = useSearchParams();
  const extensionId = searchParams.get('extensionId');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    const allowedId = process.env.NEXT_PUBLIC_EXTENSION_ID;
    if (!extensionId || !allowedId || extensionId !== allowedId) {
      setErrorMsg('인증되지 않은 확장 프로그램입니다. Offlo 공식 확장 프로그램에서 다시 시도해주세요.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // 확장 프로그램으로 토큰 전송
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cr = (globalThis as any).chrome;
      if (cr?.runtime?.sendMessage) {
        cr.runtime.sendMessage(extensionId, { type: 'AUTH_SUCCESS', idToken });
      }

      setStatus('success');
      setTimeout(() => window.close(), 1500);
    } catch {
      setStatus('error');
      setErrorMsg('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <p style={logoStyle}>Offlo</p>
        <h1 style={titleStyle}>확장 프로그램 연결</h1>
        <p style={descStyle}>
          Google 계정으로 로그인하면<br />
          웹 사용 시간이 자동으로 기록됩니다.
        </p>

        {status === 'success' && (
          <p style={{ color: '#3DDB87', fontSize: 15, marginTop: 8 }}>
            ✓ 로그인 완료! 탭을 닫는 중...
          </p>
        )}

        {status === 'error' && (
          <>
            <p style={{ color: '#ff7070', fontSize: 13, marginBottom: 14 }}>{errorMsg}</p>
            <button style={btnStyle} onClick={() => setStatus('idle')}>
              다시 시도
            </button>
          </>
        )}

        {(status === 'idle' || status === 'loading') && (
          <button
            style={{ ...btnStyle, opacity: status === 'loading' ? 0.7 : 1 }}
            onClick={handleLogin}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '로그인 중...' : 'Google로 로그인'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── 페이지 엔트리 ──────────────────────────────────────── */
// useSearchParams는 Suspense 경계 안에서만 사용 가능

export default function ExtensionAuthPage() {
  return (
    <Suspense>
      <ExtensionAuthContent />
    </Suspense>
  );
}

/* ── 인라인 스타일 ──────────────────────────────────────── */

const wrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-card)',
  borderRadius: 20,
  padding: '40px 32px',
  textAlign: 'center',
  maxWidth: 360,
  width: '100%',
  boxShadow: 'var(--shadow-card)',
};

const logoStyle: React.CSSProperties = {
  color: '#3DDB87',
  fontSize: 26,
  fontWeight: 700,
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 10,
};

const descStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 14,
  lineHeight: 1.7,
  marginBottom: 28,
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: '#3DDB87',
  color: '#0A0A0F',
  border: 'none',
  borderRadius: 999,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
