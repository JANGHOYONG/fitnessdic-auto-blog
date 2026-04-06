'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-6xl mb-4">⚠️</p>
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
        문제가 발생했습니다
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        일시적인 오류입니다. 잠시 후 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--primary)' }}
      >
        다시 시도
      </button>
    </div>
  );
}
