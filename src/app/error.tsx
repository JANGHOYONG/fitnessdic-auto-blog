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
      <p className="text-sm mb-4 font-mono bg-gray-100 p-3 rounded-lg text-left max-w-xl" style={{ color: '#c00' }}>
        {error?.message || String(error)}
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
