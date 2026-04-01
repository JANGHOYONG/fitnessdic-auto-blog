'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { name: '건강·의학', slug: 'health' },
  { name: 'IT·테크',   slug: 'tech' },
  { name: '경제·재테크', slug: 'economy' },
  { name: '생활정보',  slug: 'lifestyle' },
  { name: '여행·문화', slug: 'travel' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Smart Info Blog';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* 로고 */}
          <Link href="/" className="font-bold text-xl shrink-0" style={{ color: 'var(--primary)' }}>
            {siteName}
          </Link>

          {/* 데스크탑 내비게이션 */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="btn-ghost text-sm"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* 우측 액션 */}
          <div className="flex items-center gap-1">
            {/* 검색 */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="검색어 입력..."
                  className="w-40 md:w-56 px-3 py-1.5 text-sm rounded-lg border outline-none"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  onBlur={() => { if (!query) setSearchOpen(false); }}
                />
                <button type="submit" className="btn-ghost p-2 ml-1">
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

            {/* 다크모드 토글 */}
            <button
              className="btn-ghost p-2"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="테마 변경"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* 모바일 메뉴 버튼 */}
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="메뉴"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {menuOpen && (
          <div className="md:hidden py-2 border-t" style={{ borderColor: 'var(--border)' }}>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="block px-4 py-3 text-sm transition-colors"
                style={{ color: 'var(--text)' }}
                onClick={() => setMenuOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href="/about"
              className="block px-4 py-3 text-sm"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setMenuOpen(false)}
            >
              소개
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
