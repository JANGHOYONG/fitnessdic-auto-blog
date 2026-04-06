'use client';
import { useState } from 'react';

interface Props { className?: string; }

export default function NewsletterCTA({ className = '' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      className={`rounded-2xl p-6 text-center ${className}`}
      style={{ background: 'linear-gradient(135deg, #177A5E 0%, #1E9E7A 100%)' }}
    >
      <p className="text-2xl mb-1">📬</p>
      <h3 className="text-lg font-bold text-white mb-1">건강 정보 뉴스레터</h3>
      <p className="text-sm text-white mb-4" style={{ opacity: 0.85 }}>
        매주 엄선한 건강 정보를 이메일로 받아보세요
      </p>
      {status === 'done' ? (
        <p className="text-white font-medium">✅ 구독 신청이 완료되었습니다!</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소 입력"
            required
            className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
            style={{ color: 'var(--text)' }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white transition-opacity hover:opacity-90"
            style={{ color: 'var(--primary-dark)' }}
          >
            {status === 'loading' ? '...' : '구독'}
          </button>
        </form>
      )}
      {status === 'error' && (
        <p className="text-white text-xs mt-2" style={{ opacity: 0.8 }}>
          오류가 발생했습니다. 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
