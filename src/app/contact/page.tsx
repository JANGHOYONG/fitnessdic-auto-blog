import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의하기 | 다이어트·건강·피부미용 백과',
  description:
    '다이어트·건강·피부미용 백과에 문의하세요. 일반 문의, 광고·협찬 문의, 오류·정정 제보를 받습니다.',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.75rem',
  marginBottom: '1.25rem',
};

const h2Style: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: '0.6rem',
};

const pStyle: React.CSSProperties = {
  fontSize: '0.93rem',
  lineHeight: 1.8,
  color: 'var(--text-muted)',
  marginBottom: '0.5rem',
};

const emailLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '0.5rem',
  padding: '0.55rem 1.25rem',
  background: 'var(--primary)',
  color: '#fff',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.9rem',
  textDecoration: 'none',
};

export default function ContactPage() {
  return (
    <>
      {/* 상단 헤더 */}
      <div
        style={{
          background: 'var(--primary)',
          padding: '2.5rem 1rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.4rem',
          }}
        >
          문의하기
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.9rem' }}>
          다이어트·건강·피부미용 백과
        </p>
      </div>

      {/* 본문 */}
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '2.5rem 1rem',
        }}
      >
        {/* 응답 시간 안내 */}
        <div
          style={{
            background: '#FFF8F3',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '2rem',
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
          }}
        >
          영업일 기준 <strong style={{ color: 'var(--text)' }}>2일 이내</strong>에 답변
          드립니다. 주말·공휴일은 제외됩니다.
        </div>

        {/* 일반 문의 */}
        <div style={cardStyle}>
          <h2 style={h2Style}>일반 문의</h2>
          <p style={pStyle}>
            콘텐츠에 대한 궁금증, 특정 주제 요청, 기타 사이트 이용 관련 문의를 받습니다.
          </p>
          <a href="mailto:ghdyd6913@gmail.com" style={emailLinkStyle}>
            ghdyd6913@gmail.com 으로 문의
          </a>
        </div>

        {/* 광고·협찬 문의 */}
        <div style={cardStyle}>
          <h2 style={h2Style}>광고·협찬 문의</h2>
          <p style={pStyle}>
            제품 리뷰, 배너 광고, 콘텐츠 협찬에 관심 있으신 분은 아래 이메일로 연락해 주세요.
            브랜드명, 협찬 형태, 희망 일정을 함께 보내주시면 빠르게 검토 후 회신 드립니다.
          </p>
          <p style={pStyle}>
            협찬 콘텐츠는 반드시 [광고] 또는 [협찬] 표기를 포함하며, 편집권은 본 사이트가
            보유합니다.
          </p>
          <a href="mailto:ghdyd6913@gmail.com" style={emailLinkStyle}>
            ghdyd6913@gmail.com 으로 문의
          </a>
        </div>

        {/* 오류·정정 제보 */}
        <div style={cardStyle}>
          <h2 style={h2Style}>오류·정정 제보</h2>
          <p style={pStyle}>
            콘텐츠 내용 중 사실 오류, 구식 정보, 오타를 발견하셨나요? 독자분의 제보가 콘텐츠
            품질을 높이는 가장 큰 힘입니다.
          </p>
          <p style={pStyle}>
            이메일 제목에 <strong style={{ color: 'var(--text)' }}>[오류 제보]</strong>를
            기입하고, 해당 글 URL과 오류 내용을 함께 보내주시면 신속히 수정하겠습니다.
          </p>
          <a href="mailto:ghdyd6913@gmail.com?subject=[오류 제보]" style={emailLinkStyle}>
            오류 제보하기
          </a>
        </div>

        {/* 유의사항 */}
        <div
          style={{
            padding: '1rem',
            background: '#F9F6F3',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.75,
          }}
        >
          본 사이트는 의료 상담을 제공하지 않습니다. 건강 이상이 의심되는 경우 반드시
          전문의와 상담하시기 바랍니다.
        </div>
      </div>
    </>
  );
}
