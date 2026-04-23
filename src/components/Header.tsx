'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

/** 공통 스텝 박스 */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#FFFCF8', borderRadius: '12px', padding: '14px 16px', border: '1.5px solid #EFE6DC' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#C4501A,#E8631A)', color: '#fff', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
      <div style={{ fontSize: '13px', color: '#1E1511', fontWeight: 600, paddingTop: '4px' }}>{children}</div>
    </div>
  );
}

/** 링크 복사 행 */
function CopyLinkRow() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText('https://smartinfohealth.co.kr').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <p style={{ flex: 1, fontSize: '12px', color: '#6B625C', background: '#fff', borderRadius: '8px', padding: '7px 10px', border: '1px solid #EFE6DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          smartinfohealth.co.kr
        </p>
        <button onClick={copy} style={{ flexShrink: 0, padding: '7px 12px', background: 'linear-gradient(90deg,#C4501A,#E8631A)', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          링크 복사
        </button>
      </div>
      {copied && (
        <p style={{ marginTop: '6px', fontSize: '12px', color: '#E8631A', fontWeight: 600 }}>
          ✓ 링크가 복사되었습니다. Safari에 붙여넣기 해주세요!
        </p>
      )}
    </div>
  );
}

/** 모바일 헤더 전용 앱 다운로드 버튼 */
function AppDownloadHeaderBtn() {
  const [show, setShow]           = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [prompt, setPrompt]       = useState<any>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as any).standalone === true) return;

    const ua = navigator.userAgent;
    const ios     = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);
    if (ios) setIsIOS(true);
    if (android) setIsAndroid(true);

    setShow(true);

    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = async () => {
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } else {
      setShowSheet(true);
    }
  };

  if (!show) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="md:hidden"
        style={{
          padding: '5px 10px',
          background: 'var(--bg-bar)',
          color: 'var(--primary)',
          borderRadius: '8px',
          border: '1.5px solid var(--border)',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: 'none',
          flexShrink: 0,
        }}
      >
        📲 앱 다운로드
      </button>

      {showSheet && (
        <>
          <div
            onClick={() => setShowSheet(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'calc(100% - 48px)', maxWidth: '360px',
              zIndex: 9999,
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px 24px',
              boxShadow: '0 8px 48px rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg,#FF8437,#E8631A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>💪</div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 800, color: '#1E1511' }}>홈 화면에 추가하기</p>
                <p style={{ fontSize: '12px', color: '#6B625C', marginTop: '2px' }}>앱처럼 바로 실행할 수 있어요</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {isIOS && (<>
                <Step n={1}>
                  <p style={{ fontSize: '13px', color: '#1E1511', fontWeight: 600, marginBottom: '8px' }}>
                    Safari를 열고 아래 링크를 복사해주세요
                  </p>
                  <CopyLinkRow />
                </Step>
                <Step n={2}><span>하단 <strong>공유 버튼 ⬆️</strong> 을 눌러주세요</span></Step>
                <Step n={3}><span><strong>"홈 화면에 추가"</strong> 를 눌러주세요</span></Step>
              </>)}

              {isAndroid && (<>
                <Step n={1}><span>브라우저에서 <strong>"홈 화면에 추가"</strong> 버튼을 눌러주세요</span></Step>
                <Step n={2}><span><strong>"추가"</strong> 버튼을 눌러 완료해주세요</span></Step>
              </>)}
            </div>

            <button onClick={() => setShowSheet(false)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(90deg,#C4501A,#E8631A)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
              확인
            </button>
          </div>
        </>
      )}
    </>
  );
}

const CATEGORIES = [
  { name: '다이어트',      href: '/diet',         accent: 'coral' },
  { name: '운동·헬스',     href: '/exercise',     accent: 'coral' },
  { name: '홈트레이닝',    href: '/hometraining', accent: 'coral' },
  { name: '러닝·유산소',   href: '/running',      accent: 'coral' },
  { name: '식단·영양',     href: '/nutrition',    accent: 'sage'  },
  { name: '영양제',        href: '/supplement',   accent: 'sage'  },
  { name: '생활건강',      href: '/health',       accent: 'sage'  },
  { name: '스킨케어',      href: '/skincare',     accent: 'rose'  },
  { name: '뷰티',          href: '/beauty',       accent: 'rose'  },
  { name: '바디프로필',    href: '/motivation',   accent: 'coral' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(255,252,248,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: scrolled ? '0 2px 12px rgba(30,21,17,0.08)' : 'none',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 gap-3">

          {/* 로고 */}
          <Link href="/" className="shrink-0 flex items-center gap-2" onClick={() => { window.location.href = '/'; }}>
            <span className="text-xl">💪</span>
            <span className="font-bold text-base tracking-tight hidden sm:inline" style={{ color: 'var(--primary)' }}>
              다이어트·건강 백과
            </span>
            <span className="font-bold text-base tracking-tight sm:hidden" style={{ color: 'var(--primary)' }}>
              다이어트·건강
            </span>
          </Link>

          {/* 데스크탑 카테고리 네비 — 가로 스크롤 */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center overflow-x-auto">
            {CATEGORIES.map((c) => {
              const isActive = pathname?.startsWith(c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  style={{
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  {c.name}
                </Link>
              );
            })}
          </nav>

          {/* 모바일 앱 다운로드 버튼 */}
          <AppDownloadHeaderBtn />

          {/* 우측: 검색 + 모바일 메뉴 */}
          <div className="flex items-center gap-1 ml-auto">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="검색..."
                  className="w-32 sm:w-48 px-3 py-2 text-sm rounded-xl border outline-none"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  onBlur={() => { if (!query) setSearchOpen(false); }}
                />
                <button type="submit" className="btn-ghost p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            ) : (
              <button className="btn-ghost p-2" onClick={() => setSearchOpen(true)} aria-label="검색">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="메뉴"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 드롭다운 */}
        {menuOpen && (
          <div className="md:hidden py-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-2 gap-1 py-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="block px-3 py-3 text-sm font-medium rounded-xl"
                  style={{ color: 'var(--text)', minHeight: '44px', display: 'flex', alignItems: 'center' }}
                  onClick={() => setMenuOpen(false)}
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="border-t pt-2 mt-1" style={{ borderColor: 'var(--border)' }}>
              {[
                { href: '/about', label: '📖 소개' },
                { href: '/contact', label: '✉️ 문의' },
                { href: '/disclaimer', label: '⚖️ 면책 고지' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block px-3 py-2.5 text-sm"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 포인트 라인 */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, var(--coral-500), var(--sage-500), var(--rose-500))' }} />
    </header>
  );
}
