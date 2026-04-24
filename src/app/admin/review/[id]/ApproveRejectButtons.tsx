'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// v3 발행 전 체크리스트 (12원칙 중 자동 미검증 + 핵심 수동 항목)
// "저자 1인칭 마커" 항목은 가짜 정보 방지를 위해 제외
const CHECKLIST = [
  { id: 'c1',  label: '제목이 약속한 답이 첫 300자 안에 나온다' },
  { id: 'c2',  label: '금지어 0회 — "꾸준함이 중요", "개인차가 있으므로", "균형 있게", "좋은 방법" 등 없음' },
  { id: 'c3',  label: '구체 수치 10개 이상 (kg·g·분·%·cm·회·L 등)' },
  { id: 'c4',  label: '독자 유형별 IF-THEN 분기 최소 2개 ("아침형이면 A, 직장인이면 B" 등)' },
  { id: 'c5',  label: '"이럴 때 멈춰라" 섹션 — 구체 증상 5개 이상 나열됨' },
  { id: 'c6',  label: '책임 회피 구절("전문가와 상담") 본문 중간 0회 — 맨 끝 면책 박스에만 있음' },
  { id: 'c7',  label: 'FAQ — 본문에서 안 다룬 새로운 각도의 질문만 담겨 있음 (요약 반복 아님)' },
  { id: 'c8',  label: '근거 인용: 발표연도 + 기관/저널 + 핵심 숫자 + 독자 행동 — 4요소가 문장 안에 있음' },
  { id: 'c9',  label: '단락 리듬 다양 — 1줄 임팩트 문장, 3~4줄 설명, 리스트, 1줄 정리가 혼재됨' },
  { id: 'c10', label: '현실적 기대치 — "2주에 0.5~1.5kg" 형태로 기간+수치+조건 명시됨' },
  { id: 'c11', label: '"오늘 당장 할 한 가지 행동"으로 마무리 — 요약 반복이 아닌 실천 지침' },
];

export default function ApproveRejectButtons({
  postId,
  currentStatus,
  qualityScore,
  rejectReasons,
}: {
  postId: number;
  currentStatus: string;
  qualityScore?: number | null;
  rejectReasons?: string[];
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const router = useRouter();

  const allChecked = CHECKLIST.every((item) => checked[item.id]);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleApprove = async () => {
    if (!allChecked) return;
    if (!confirm('체크리스트를 모두 확인했습니다. 승인하시겠습니까?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        alert('✅ 승인 완료! APPROVED → 다음 KST 18:00에 자동 발행됩니다.');
        router.push('/admin/review');
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

  if (currentStatus === 'APPROVED') {
    return (
      <div style={{ padding: '16px 20px', background: '#D1FAE5', borderRadius: '12px', color: '#065F46', fontWeight: 700, fontSize: '14px', marginBottom: '20px' }}>
        ✅ 이미 승인됨 — 다음 KST 18:00에 자동 발행됩니다
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #EFE6DC', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>

      {/* 자동 품질 점수 요약 */}
      {(qualityScore !== null && qualityScore !== undefined) && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
          background: qualityScore >= 90 ? '#D1FAE5' : qualityScore >= 70 ? '#FFF3CD' : '#FEE2E2',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: qualityScore >= 90 ? '#065F46' : qualityScore >= 70 ? '#856404' : '#991B1B' }}>
            {qualityScore}점
          </span>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E1511' }}>자동 품질 점수 (v3)</p>
            {rejectReasons && rejectReasons.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#991B1B' }}>
                {rejectReasons.slice(0, 3).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 수동 감수 체크리스트 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E1511' }}>
            📋 발행 전 체크리스트
          </p>
          <span style={{
            fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '9999px',
            background: allChecked ? '#D1FAE5' : '#F3F4F6',
            color: allChecked ? '#065F46' : '#6B7280',
          }}>
            {checkedCount} / {CHECKLIST.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CHECKLIST.map((item) => (
            <label
              key={item.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
                padding: '10px 12px', borderRadius: '8px',
                background: checked[item.id] ? '#F0FDF4' : '#FAFAFA',
                border: `1px solid ${checked[item.id] ? '#BBF7D0' : '#EFE6DC'}`,
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={() => toggle(item.id)}
                style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#E8631A', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', lineHeight: 1.6, color: checked[item.id] ? '#065F46' : '#374151' }}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 승인 버튼 */}
      {!allChecked && (
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '10px', textAlign: 'center' }}>
          체크리스트 {CHECKLIST.length - checkedCount}개 항목을 더 확인하면 승인 버튼이 활성화됩니다
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleApprove}
          disabled={!allChecked || loading}
          style={{
            padding: '12px 28px',
            background: allChecked ? '#E8631A' : '#D1D5DB',
            color: allChecked ? '#fff' : '#9CA3AF',
            borderRadius: '10px', border: 'none',
            fontWeight: 700, cursor: allChecked ? 'pointer' : 'not-allowed',
            fontSize: '15px', transition: 'all 0.2s',
          }}
        >
          {loading ? '처리 중...' : '✅ 승인 (APPROVED)'}
        </button>

        <button
          onClick={() => setShowReject(!showReject)}
          disabled={loading}
          style={{ padding: '12px 24px', background: '#FEE2E2', color: '#991B1B', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}
        >
          ❌ 반려
        </button>
      </div>

      {showReject && (
        <div style={{ marginTop: '16px', padding: '16px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
          <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>반려 사유 (필수)</p>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="예: FAQ가 본문 내용 반복 / 수치가 5개뿐 / 중단 신호 없음"
            style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', background: '#fff' }}
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
