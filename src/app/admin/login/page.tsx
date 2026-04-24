'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/admin/review');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#FFFCF8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', border: '1px solid #EFE6DC', borderRadius: '20px',
        padding: '40px 36px', width: '100%', maxWidth: '380px',
        boxShadow: '0 4px 24px rgba(30,21,17,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔒</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1E1511', margin: 0 }}>
            감수 어드민
          </h1>
          <p style={{ fontSize: '13px', color: '#6B625C', marginTop: '6px' }}>
            다이어트·건강 백과
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1511', display: 'block', marginBottom: '6px' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', fontSize: '15px',
                border: '1.5px solid #EFE6DC', borderRadius: '10px',
                outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#E8631A')}
              onBlur={(e) => (e.target.style.borderColor = '#EFE6DC')}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#991B1B', marginBottom: '12px', margin: '0 0 12px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700,
              background: loading ? '#C4501A' : '#E8631A', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
