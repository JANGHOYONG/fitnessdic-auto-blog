import type { Metadata } from 'next';

export const metadata: Metadata = { title: '감수 어드민 | 다이어트·건강 백과' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <div style={{
        background: '#1E1511', color: '#fff', padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: '15px' }}>🔒 감수 어드민 — 다이어트·건강 백과</span>
        <a href="/" style={{ color: '#E8631A', fontSize: '13px' }}>← 사이트로</a>
      </div>
      <nav style={{ background: '#fff', borderBottom: '1px solid #EFE6DC', padding: '0 24px', display: 'flex', gap: '4px' }}>
        <a href="/admin/review" style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#E8631A', display: 'block' }}>
          감수 큐
        </a>
      </nav>
      <main style={{ padding: '24px' }}>{children}</main>
    </div>
  );
}
