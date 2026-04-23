import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 | 다이어트·건강·피부미용 백과',
  description:
    '다이어트·건강·피부미용 백과 이용약관입니다. 서비스 이용 조건, 콘텐츠 저작권, 면책 조항, 분쟁 해결 기준을 안내합니다.',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
};

const h2Style: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: '0.6rem',
  paddingBottom: '0.4rem',
  borderBottom: '2px solid var(--border)',
};

const pStyle: React.CSSProperties = {
  fontSize: '0.93rem',
  lineHeight: 1.85,
  color: 'var(--text-muted)',
  marginBottom: '0.6rem',
};

export default function TermsPage() {
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
          이용약관
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
        <div
          style={{
            background: '#FFF8F3',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '2rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          시행일: 2026년 4월 23일 &nbsp;|&nbsp; 운영: 다이어트·건강·피부미용 백과 (smartinfohealth.co.kr)
        </div>

        <section style={sectionStyle}>
          <h2 style={h2Style}>제1조 (목적)</h2>
          <p style={pStyle}>
            이 약관은 다이어트·건강·피부미용 백과(이하 "본 사이트")가 제공하는 인터넷 서비스의
            이용 조건 및 절차, 운영자와 이용자의 권리·의무 및 책임에 관한 사항을 규정함을
            목적으로 합니다.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>제2조 (서비스 이용 동의)</h2>
          <p style={pStyle}>
            본 사이트에 접속하거나 콘텐츠를 이용하는 행위는 본 약관에 동의함을 의미합니다.
            약관에 동의하지 않는 경우 서비스 이용을 중단하시기 바랍니다.
          </p>
          <p style={pStyle}>
            본 사이트는 사전 통지 없이 약관을 변경할 수 있으며, 변경된 약관은 사이트에 게시된
            시점부터 효력이 발생합니다. 이용자는 변경 약관을 주기적으로 확인할 의무가 있습니다.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>제3조 (콘텐츠 저작권)</h2>
          <p style={pStyle}>
            본 사이트에 게재된 모든 텍스트, 이미지, 영상, 디자인, 코드 등의 콘텐츠에 대한
            저작권은 본 사이트 운영자 또는 정당한 권리를 보유한 제3자에게 있습니다.
          </p>
          <p style={pStyle}>
            이용자는 개인적·비상업적 목적으로 콘텐츠를 열람할 수 있으나, 운영자의 사전 서면
            동의 없이 복제, 배포, 전송, 출판, 방송, 편집, 2차 저작물 작성 등의 행위를 할 수
            없습니다.
          </p>
          <p style={pStyle}>
            단, 정당한 인용(출처 명시 포함)은 저작권법의 범위 내에서 허용됩니다.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>제4조 (면책 조항)</h2>
          <p style={pStyle}>
            본 사이트가 제공하는 모든 콘텐츠는 일반적인 정보 제공을 목적으로 하며, 의사·영양사·
            피부과 전문의 등 자격을 갖춘 전문가의 개인 맞춤 진단이나 처방을 대체하지 않습니다.
          </p>
          <p style={pStyle}>
            본 사이트는 콘텐츠의 정확성·완전성·최신성을 보증하지 않으며, 콘텐츠 이용으로
            인해 발생한 직접적·간접적 손해에 대해 법적 책임을 지지 않습니다.
          </p>
          <p style={pStyle}>
            외부 링크(쿠팡파트너스 포함)를 통해 연결된 사이트의 콘텐츠 및 서비스에 대한
            책임은 해당 사이트에 있습니다.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>제5조 (이용자 의무)</h2>
          <p style={pStyle}>이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            {[
              '본 사이트 콘텐츠를 무단 복제·배포·상업적으로 이용하는 행위',
              '본 사이트 운영을 방해하거나 서버에 과도한 부하를 주는 행위',
              '타인의 개인정보를 도용하거나 허위 정보를 게시하는 행위',
              '관련 법령을 위반하는 일체의 행위',
            ].map((item) => (
              <li
                key={item}
                style={{
                  fontSize: '0.93rem',
                  lineHeight: 1.85,
                  color: 'var(--text-muted)',
                  marginBottom: '0.3rem',
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>제6조 (서비스 변경 및 중단)</h2>
          <p style={pStyle}>
            본 사이트는 운영상·기술상 필요에 따라 서비스 내용을 변경하거나 중단할 수 있으며,
            이로 인해 발생하는 손해에 대해 별도의 보상 의무를 지지 않습니다.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>제7조 (분쟁 해결)</h2>
          <p style={pStyle}>
            본 약관은 대한민국 법을 준거법으로 합니다. 본 사이트 이용과 관련하여 발생한
            분쟁에 대해서는 대한민국 법원을 관할 법원으로 합니다.
          </p>
          <p style={pStyle}>
            분쟁 발생 시 먼저 이메일(ghdyd6913@gmail.com)을 통한 협의로 해결을 시도합니다.
          </p>
        </section>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: '2rem',
          }}
        >
          시행일: 2026년 4월 23일
        </p>
      </div>
    </>
  );
}
