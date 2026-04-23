import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '의료 면책 고지 | 다이어트·건강·피부미용 백과',
  description:
    '다이어트·건강·피부미용 백과의 의료 면책 고지입니다. 본 사이트 콘텐츠는 의료진의 진단·치료를 대체하지 않습니다.',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '1.75rem',
  padding: '1.5rem',
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: '12px',
};

const h2Style: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: '0.75rem',
};

const pStyle: React.CSSProperties = {
  fontSize: '0.93rem',
  lineHeight: 1.85,
  color: 'var(--text-muted)',
  marginBottom: '0.6rem',
};

export default function DisclaimerPage() {
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
          의료 면책 고지
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.9rem' }}>
          Medical Disclaimer — 다이어트·건강·피부미용 백과
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

        {/* 핵심 면책 고지 (강조 박스) */}
        <div
          style={{
            background: '#FFF4EE',
            border: '2px solid var(--primary)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <p
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '0.75rem',
            }}
          >
            중요 안내
          </p>
          <p
            style={{
              fontSize: '0.93rem',
              lineHeight: 1.9,
              color: 'var(--text)',
            }}
          >
            본 사이트의 모든 콘텐츠는 <strong>일반적 정보 제공을 목적</strong>으로 하며,
            의료진의 진단이나 치료를 대체하지 않습니다. 건강상 문제가 의심되는 경우
            반드시 <strong>전문의와 상담</strong>하세요.
            개인차가 있을 수 있으며, 특정 제품·운동·식단의 효과를 보장하지 않습니다.
          </p>
        </div>

        {/* 의료 정보 면책 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>의료 정보 면책</h2>
          <p style={pStyle}>
            본 사이트(smartinfohealth.co.kr)에 게재된 다이어트·건강·피부미용 관련 콘텐츠는
            의사, 영양사, 피부과 전문의, 운동처방사 등 자격을 갖춘 전문가의 개인 맞춤
            진단·치료·처방을 대체하지 않습니다.
          </p>
          <p style={pStyle}>
            콘텐츠를 의료 조언의 대체 수단으로 사용하지 마시고, 개인 건강 상태에 대한 결정은
            반드시 전문 의료인과 상담 후 내리시기 바랍니다.
          </p>
          <p style={pStyle}>
            특히 고혈압, 당뇨, 심장 질환, 관절 질환, 피부 질환, 섭식 장애 등 기저질환이 있는
            경우 콘텐츠의 내용을 적용하기 전에 반드시 담당 의사와 먼저 상의하세요.
          </p>
        </section>

        {/* 개인차 및 효과 미보장 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>개인차 및 효과 미보장</h2>
          <p style={pStyle}>
            동일한 운동·식단·제품이라도 개인의 체질, 연령, 건강 상태, 생활 습관에 따라
            결과가 다를 수 있습니다. 본 사이트는 특정 방법이나 제품의 효과를 보장하지
            않으며, 콘텐츠 적용으로 인한 결과에 대해 법적 책임을 지지 않습니다.
          </p>
        </section>

        {/* 쿠팡파트너스 수익화 고지 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>쿠팡파트너스 수익화 고지</h2>
          <p style={pStyle}>
            본 사이트의 일부 콘텐츠에는 쿠팡파트너스 제휴 링크가 포함되어 있습니다.
            이 링크를 통해 구매가 이루어질 경우 본 사이트는 일정 수수료를 받을 수 있습니다.
          </p>
          <p style={pStyle}>
            수수료 수취 여부는 콘텐츠의 내용이나 제품 평가에 영향을 주지 않으며, 이용자에게
            추가 비용이 발생하지 않습니다. 제휴 링크가 포함된 콘텐츠에는 아래 문구를
            명시합니다.
          </p>
          <div
            style={{
              background: '#F9F6F3',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
            }}
          >
            "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
            제공받을 수 있습니다."
          </div>
        </section>

        {/* AI 생성 콘텐츠 고지 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>AI 생성 콘텐츠 고지</h2>
          <p style={pStyle}>
            본 사이트의 일부 콘텐츠는 인공지능(AI) 도구를 활용하여 초안을 생성한 후,
            편집자가 전문가 기준 및 사실 관계를 검토하여 게재합니다.
          </p>
          <p style={pStyle}>
            AI 생성 콘텐츠라 하더라도 동일한 편집 품질 기준(전문 출처 근거, 개인차 명시,
            오류 검토)이 적용됩니다. 오류 발견 시 언제든지{' '}
            <a
              href="mailto:ghdyd6913@gmail.com?subject=[오류 제보]"
              style={{ color: 'var(--primary)', textDecoration: 'underline' }}
            >
              ghdyd6913@gmail.com
            </a>
            으로 제보해 주세요.
          </p>
        </section>

        {/* 외부 링크 */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>외부 링크 면책</h2>
          <p style={pStyle}>
            본 사이트에 포함된 외부 링크는 편의를 위해 제공되며, 해당 외부 사이트의 콘텐츠·
            정확성·개인정보보호 정책에 대한 책임은 해당 사이트에 있습니다.
          </p>
        </section>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: '1rem',
          }}
        >
          최종 업데이트: 2026년 4월 23일
        </p>
      </div>
    </>
  );
}
