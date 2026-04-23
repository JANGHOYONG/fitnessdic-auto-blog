import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import ApproveRejectButtons from './ApproveRejectButtons';

export const dynamic = 'force-dynamic';

export default async function ReviewPostPage({ params }: { params: { id: string } }) {
  const postId = parseInt(params.id);
  if (isNaN(postId)) notFound();

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { category: true },
  });
  if (!post) notFound();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <a href="/admin/review" style={{ color: '#E8631A', textDecoration: 'none', fontSize: '14px' }}>← 목록</a>
        <span style={{ color: '#6B625C', fontSize: '14px' }}>|</span>
        <span style={{ fontSize: '14px', color: '#6B625C' }}>#{post.id} · {post.category?.name}</span>
        <span style={{
          padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
          background: post.status === 'REVIEW_REQUIRED' ? '#FFF3CD' : post.status === 'APPROVED' ? '#D1FAE5' : '#FEE2E2',
          color: post.status === 'REVIEW_REQUIRED' ? '#856404' : post.status === 'APPROVED' ? '#065F46' : '#991B1B',
        }}>
          {post.status}
        </span>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1E1511', marginBottom: '8px' }}>{post.title}</h1>
      <p style={{ color: '#6B625C', fontSize: '14px', marginBottom: '20px' }}>{post.excerpt}</p>

      {/* 품질 정보 */}
      <div style={{ background: '#F9FAFB', border: '1px solid #EFE6DC', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#6B625C', margin: 0 }}>품질 점수</p>
            <p style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: (post.qualityScore ?? 0) >= 70 ? '#065F46' : '#991B1B' }}>
              {post.qualityScore ?? '미검사'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#6B625C', margin: 0 }}>읽기 시간</p>
            <p style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#1E1511' }}>{(post as any).readTime ?? '-'}분</p>
          </div>
        </div>
        {post.rejectReasons && post.rejectReasons.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', margin: '0 0 6px' }}>품질 미달 사유</p>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {post.rejectReasons.map((r: string, i: number) => (
                <li key={i} style={{ fontSize: '13px', color: '#991B1B' }}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {post.reviewNotes && (
          <p style={{ fontSize: '12px', color: '#6B625C', marginTop: '8px', marginBottom: 0 }}>
            📝 {post.reviewNotes}
          </p>
        )}
      </div>

      {/* 승인/반려 버튼 (클라이언트 컴포넌트) */}
      {(post.status === 'REVIEW_REQUIRED' || post.status === 'APPROVED') && (
        <ApproveRejectButtons postId={post.id} currentStatus={post.status} />
      )}

      {/* 본문 미리보기 */}
      <div style={{ background: '#fff', border: '1px solid #EFE6DC', borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1E1511' }}>본문 미리보기</h2>
        {post.thumbnail && (
          <img src={post.thumbnail} alt="썸네일" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }} />
        )}
        <div
          dangerouslySetInnerHTML={{ __html: (post as any).content || '' }}
          style={{ fontSize: '14px', lineHeight: 1.8, color: '#1E1511' }}
        />
      </div>
    </div>
  );
}
