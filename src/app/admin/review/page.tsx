import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ReviewQueue() {
  let posts: any[] = [];
  try {
    posts = await prisma.post.findMany({
      where: { status: { in: ['REVIEW_REQUIRED', 'APPROVED', 'QUALITY_REJECTED'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { category: true },
    });
  } catch (e) {
    console.error('DB error:', e);
  }

  const statusLabel: Record<string, string> = {
    REVIEW_REQUIRED: '감수 필요',
    APPROVED: '승인됨',
    QUALITY_REJECTED: '품질 미달',
  };

  const statusStyle: Record<string, React.CSSProperties> = {
    REVIEW_REQUIRED: { background: '#FFF3CD', color: '#856404', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 },
    APPROVED: { background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 },
    QUALITY_REJECTED: { background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 },
  };

  const reviewNeeded = posts.filter((p) => p.status === 'REVIEW_REQUIRED').length;
  const approved = posts.filter((p) => p.status === 'APPROVED').length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: '#1E1511' }}>감수 큐</h1>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFF3CD', padding: '12px 20px', borderRadius: '12px' }}>
          <p style={{ fontSize: '12px', color: '#856404', margin: 0 }}>감수 필요</p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#856404', margin: 0 }}>{reviewNeeded}</p>
        </div>
        <div style={{ background: '#D1FAE5', padding: '12px 20px', borderRadius: '12px' }}>
          <p style={{ fontSize: '12px', color: '#065F46', margin: 0 }}>승인됨 (미발행)</p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#065F46', margin: 0 }}>{approved}</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B625C' }}>감수할 글이 없습니다 ✅</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #EFE6DC', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #EFE6DC' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>제목</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>카테고리</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700 }}>상태</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700 }}>점수</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} style={{ borderBottom: '1px solid #EFE6DC' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <a href={`/admin/review/${post.id}`} style={{ color: '#1E1511', textDecoration: 'none', fontWeight: 600 }}>
                      {post.title.length > 50 ? post.title.slice(0, 50) + '…' : post.title}
                    </a>
                    {post.rejectReasons && post.rejectReasons.length > 0 && (
                      <p style={{ fontSize: '11px', color: '#991B1B', margin: '2px 0 0' }}>
                        {post.rejectReasons.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B625C' }}>{post.category?.name || '-'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={statusStyle[post.status] || {}}>
                      {statusLabel[post.status] || post.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: (post.qualityScore ?? 0) >= 70 ? '#065F46' : '#991B1B' }}>
                    {post.qualityScore ?? '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <a href={`/admin/review/${post.id}`} style={{ padding: '6px 12px', background: '#F3F4F6', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#374151', textDecoration: 'none' }}>
                        보기
                      </a>
                      {post.status === 'REVIEW_REQUIRED' && (
                        <a href={`/admin/review/${post.id}`} style={{ padding: '6px 12px', background: '#D1FAE5', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#065F46', textDecoration: 'none' }}>
                          검토
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
