import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '사이트 소개 | 다이어트·건강·피부미용 백과',
  description:
    '과학 근거와 실사용 경험이 만나는 다이어트·건강·피부미용 백과. 편집 원칙, 품질 기준, 운영 미션을 소개합니다.',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '다이어트·건강·피부미용 백과',
  url: 'https://smartinfohealth.co.kr',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'ghdyd6913@gmail.com',
    contactType: 'customer support',
    availableLanguage: 'Korean',
  },
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
  padding: '1.75rem',
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: '12px',
};

const h2Style: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: '0.75rem',
};

const pStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  lineHeight: 1.8,
  color: 'var(--text-muted)',
  marginBottom: '0.6rem',
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 상단 헤더 */}
      <div
        style={{
          background: 'var(--primary)',
          padding: '3rem 1rem',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💪</p>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.5rem',
          }}
        >
          다이어트·건강·피부미용 백과 소개
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem' }}>
          30·40·50대를 위한 과학적 다이어트·건강·피부미용 가이드
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
        {/* 미션 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>우리의 미션</h2>
          <p style={{ ...pStyle, fontWeight: 600, color: 'var(--primary)' }}>
            "과학 근거와 실사용 경험이 만나는 다이어트·건강·피부미용 백과"
          </p>
          <p style={pStyle}>
            인터넷에는 검증되지 않은 원푸드 다이어트, 과장된 보충제 광고, 근거 없는 피부 관리법이
            넘쳐납니다. 본 사이트는 국내외 공인 의학·영양·피부과학 연구를 토대로 30~50대 일반인이
            안전하게 실천할 수 있는 정보만을 제공합니다.
          </p>
          <p style={pStyle}>
            "단기간에 OO kg 감량" 같은 과장 표현은 사용하지 않으며, 개인의 체질·건강 상태에 따른
            차이를 항상 명시합니다.
          </p>
        </section>

        {/* 편집 원칙 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>편집 원칙 3가지</h2>

          <div
            style={{
              borderLeft: '3px solid var(--primary)',
              paddingLeft: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <p
              style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}
            >
              1. 편집권 독립성
            </p>
            <p style={pStyle}>
              광고주·협찬사로부터 콘텐츠 편집에 대한 일체의 간섭을 받지 않습니다. 광고·협찬
              콘텐츠는 본문과 명확히 분리하여 표기합니다.
            </p>
          </div>

          <div
            style={{
              borderLeft: '3px solid var(--primary)',
              paddingLeft: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <p
              style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}
            >
              2. 광고·협찬 표기 원칙
            </p>
            <p style={pStyle}>
              쿠팡파트너스를 포함한 제휴 링크가 포함된 경우 반드시 "이 포스팅은 쿠팡 파트너스
              활동의 일환으로 수수료를 제공받을 수 있습니다" 문구를 명시합니다. 협찬 제품 리뷰는
              [광고] 표기를 의무화합니다.
            </p>
          </div>

          <div
            style={{
              borderLeft: '3px solid var(--primary)',
              paddingLeft: '1rem',
            }}
          >
            <p
              style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}
            >
              3. 의료 면책 원칙
            </p>
            <p style={pStyle}>
              본 사이트의 모든 콘텐츠는 일반 정보 제공 목적이며, 의사·영양사·피부과 전문의 등
              자격을 갖춘 전문가의 개인 맞춤 진단·처방을 대체하지 않습니다. 건강 이상이 의심되면
              반드시 전문의와 상담하시기 바랍니다.
            </p>
          </div>
        </section>

        {/* 품질 기준 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>콘텐츠 품질 기준</h2>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            {[
              '2,500자 이상의 충분한 내용 (전문성·신뢰성·경험 반영)',
              '논문·정부 기관·학회 등 전문가 출처 근거 명시',
              '자주 묻는 질문(FAQ) 최소 2개 포함',
              '이해를 돕는 이미지 또는 표 포함',
              '개인차 및 주의사항 문구 필수 삽입',
              '오류·구식 정보 발견 시 즉시 수정·업데이트',
            ].map((item) => (
              <li
                key={item}
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.8,
                  color: 'var(--text-muted)',
                  marginBottom: '0.4rem',
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 문의 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>문의하기</h2>
          <p style={pStyle}>
            콘텐츠 오류 제보, 주제 요청, 광고·협찬 문의는 아래 이메일로 연락해 주세요. 영업일
            기준 2일 이내에 답변 드립니다.
          </p>
          <a
            href="mailto:ghdyd6913@gmail.com"
            style={{
              display: 'inline-block',
              marginTop: '0.25rem',
              color: 'var(--primary)',
              fontWeight: 700,
              textDecoration: 'underline',
              fontSize: '0.95rem',
            }}
          >
            ghdyd6913@gmail.com
          </a>
        </section>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          마지막 업데이트: 2026년 4월 23일
        </p>
      </div>
    </>
  );
}
