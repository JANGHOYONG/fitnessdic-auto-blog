'use client';
import { useState } from 'react';

interface Props { title: string; url: string; }

export default function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () =>
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');

  const shareKakao = () => {
    if (typeof window !== 'undefined' && (window as any).Kakao?.isInitialized()) {
      (window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title, description: '', webUrl: url, mobileWebUrl: url },
      });
    } else {
      shareTwitter();
    }
  };

  return (
    <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>공유하기</p>
      <div className="flex gap-2 flex-wrap">
        {/* 트위터 */}
        <button
          onClick={shareTwitter}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          트위터
        </button>

        {/* 링크 복사 */}
        <button
          onClick={copy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: copied ? '#10b981' : 'var(--bg)',
            color: copied ? 'white' : 'var(--text)',
            border: `1px solid var(--border)`,
          }}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              복사됨!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              링크 복사
            </>
          )}
        </button>
      </div>
    </div>
  );
}
