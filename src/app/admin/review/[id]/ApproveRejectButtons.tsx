'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApproveRejectButtons({ postId, currentStatus }: { postId: number; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm('이 글을 승인하시겠습니까?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        alert('승인 완료! APPROVED 상태로 변경되었습니다.');
        router.refresh();
      } else {
        const err = await res.json();
        alert('오류: ' + (err.error || '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) { alert('반려 사유를 입력해주세요.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, note: rejectNote }),
      });
      if (res.ok) {
        alert('반려 완료. DRAFT 상태로 되돌렸습니다.');
        router.push('/admin/review');
      } else {
        const err = await res.json();
        alert('오류: ' + (err.error || '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #EFE6DC', borderRadius: '12px', padding: '20px' }}>
      <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#1E1511' }}>감수 결정</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {currentStatus === 'REVIEW_REQUIRED' && (
          <button
            onClick={handleApprove}
            disabled={loading}
            style={{ padding: '10px 24px', background: '#E8631A', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
          >
            ✅ 승인 (APPROVED)
          </button>
        )}
        {currentStatus === 'APPROVED' && (
          <div style={{ padding: '8px 16px', background: '#D1FAE5', borderRadius: '10px', color: '#065F46', fontWeight: 700, fontSize: '14px' }}>
            ✅ 이미 승인됨 — 다음 발행 시각에 자동 발행됩니다
          </div>
        )}
        <button
          onClick={() => setShowReject(!showReject)}
          disabled={loading}
          style={{ padding: '10px 24px', background: '#FEE2E2', color: '#991B1B', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
        >
          ❌ 반려 (DRAFT로 복귀)
        </button>
      </div>
      {showReject && (
        <div style={{ marginTop: '16px' }}>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="반려 사유를 입력하세요 (필수)"
            style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1px solid #EFE6DC', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <button
            onClick={handleReject}
            disabled={loading || !rejectNote.trim()}
            style={{ marginTop: '8px', padding: '8px 20px', background: '#991B1B', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
          >
            반려 확정
          </button>
        </div>
      )}
    </div>
  );
}
