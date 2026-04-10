'use client';

/**
 * 앱 다운로드 버튼 (PWA 설치)
 * - 자동 팝업 없음 — 사용자가 직접 클릭할 때만 동작
 * - Android Chrome: beforeinstallprompt → 네이티브 설치 다이얼로그
 * - iOS Safari: 공유 → 홈 화면에 추가 안내 시트
 */

import { useEffect, useState } from 'react';

export default function AddToHomeScreen() {
  const [isIOS, setIsIOS]             = useState(false);
  const [showSheet, setShowSheet]     = useState(false);
  const [deferredPrompt, setDeferred] = useState<any>(null);
  const [ready, setReady]             = useState(false);

  useEffect(() => {
    // 이미 PWA 모드면 버튼 숨김
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as any).standalone === true) return;

    const ua = navigator.userAgent;
    const ios    = /iphone|ipad|ipod/i.test(ua);
    const safari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);

    if (ios && safari) {
      setIsIOS(true);
      setReady(true);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferred(e);
        setReady(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      // Android이지만 beforeinstallprompt가 없어도 iOS 안내 버튼 표시
      const timer = setTimeout(() => setReady(true), 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferred(null);
      setReady(false);
    } else {
      // iOS 또는 beforeinstallprompt 없는 경우 → 안내 시트 표시
      setShowSheet(true);
    }
  };

  if (!ready) return null;

  return (
    <>
      {/* 앱 다운로드 버튼 — 푸터에서 렌더링 위치는 Footer가 결정 */}
      <button
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.92)',
          fontSize: '14px',
        }}
      >
        📲 앱 다운로드
      </button>

      {/* iOS 안내 시트 */}
      {showSheet && (
        <>
          {/* 딤 */}
          <div
            onClick={() => setShowSheet(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* 안내 카드 */}
          <div
            style={{
              position: 'fixed',
              bottom: isIOS ? '80px' : '24px',
              left: '50%', transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)', maxWidth: '400px',
              zIndex: 9999,
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 48px rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #177A5E, #1E9E7A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                🏥
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 800, color: '#1B3A32', marginBottom: '3px' }}>
                  시니어 건강백과
                </p>
                <p style={{ fontSize: '13px', color: '#2E5A4D' }}>홈 화면에 추가하면 앱처럼 바로 열려요</p>
              </div>
            </div>

            <div
              style={{
                background: '#F2FAF7',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '14px',
                border: '1.5px solid #C5E8DA',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A32', marginBottom: '10px' }}>
                📌 홈 화면에 추가하는 방법
              </p>
              <p style={{ fontSize: '14px', color: '#1B3A32', lineHeight: 1.9 }}>
                1. 아래 <strong>닫기</strong> 버튼을 눌러 이 안내를 닫아요<br />
                2. 하단 브라우저 <strong>공유 버튼 (⬆)</strong> 탭<br />
                3. <strong>"홈 화면에 추가"</strong> 선택<br />
                4. <strong>"추가"</strong> 버튼 탭
              </p>
            </div>

            <button
              onClick={() => setShowSheet(false)}
              style={{
                width: '100%', padding: '13px',
                background: 'linear-gradient(90deg, #177A5E, #1E9E7A)', color: '#fff',
                borderRadius: '12px', border: 'none',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              닫고 공유 버튼 (⬆) 탭하기
            </button>
          </div>

          {/* iOS: 하단 화살표 — 공유버튼 아이콘(⬆)과 일치 */}
          {isIOS && (
            <div
              style={{
                position: 'fixed', bottom: '12px', left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10000,
                fontSize: '36px',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                animation: 'pwa-bounce 1.2s infinite',
              }}
            >
              ⬆️
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes pwa-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
    </>
  );
}
