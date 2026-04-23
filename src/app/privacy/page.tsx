import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 다이어트·건강·피부미용 백과',
  description:
    '다이어트·건강·피부미용 백과의 개인정보처리방침입니다. 한국 개인정보보호법 기반으로 작성되었습니다.',
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

export default function PrivacyPage() {
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
          개인정보처리방침
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
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '2rem',
            padding: '0.75rem 1rem',
            background: '#FFF8F3',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        >
          시행일: 2026년 4월 23일 &nbsp;|&nbsp; 운영자: 다이어트·건강·피부미용 백과 &nbsp;|&nbsp;
          이메일: ghdyd6913@gmail.com
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. 수집하는 개인정보 항목</h2>
          <p style={pStyle}>
            본 사이트(smartinfohealth.co.kr, 이하 "본 사이트")는 별도의 회원가입 없이 운영되며,
            이용자의 개인정보를 직접 수집하지 않습니다. 다만 아래의 경우 일부 정보가 자동으로
            수집될 수 있습니다.
          </p>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            {[
              '방문 쿠키(Cookie): 접속 페이지, 체류 시간, 유입 경로 등 익명 통계 정보',
              'Google AdSense: 맞춤 광고 제공을 위한 쿠키 및 광고 식별자',
              '뉴스레터 구독(선택): 이메일 주소 (구독 시 별도 동의)',
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
          <h2 style={h2Style}>2. 개인정보 이용 목적</h2>
          <p style={pStyle}>수집된 정보는 아래 목적에 한해 이용됩니다.</p>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            {[
              '사이트 방문 통계 분석 및 서비스 품질 개선',
              '맞춤형 광고 제공 (Google AdSense)',
              '뉴스레터 발송 (구독자에 한함)',
              '오류·민원 처리 및 고지 사항 전달',
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
          <h2 style={h2Style}>3. 개인정보 보관 기간</h2>
          <p style={pStyle}>
            본 사이트가 직접 보관하는 개인정보는 없습니다. 뉴스레터 이메일은 구독 해지 즉시
            삭제되며, 제3자 서비스(Google Analytics, Google AdSense)를 통해 수집된 정보는
            각 서비스의 보관 정책에 따릅니다.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. 개인정보의 제3자 제공</h2>
          <p style={pStyle}>
            본 사이트는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
            단, 아래 서비스는 자체 개인정보처리방침에 따라 정보를 수집·이용합니다.
          </p>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            <li
              style={{
                fontSize: '0.93rem',
                lineHeight: 1.85,
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              <strong style={{ color: 'var(--text)' }}>Google AdSense</strong> — 맞춤 광고 쿠키 사용.{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)' }}
              >
                Google 개인정보처리방침
              </a>
            </li>
            <li
              style={{
                fontSize: '0.93rem',
                lineHeight: 1.85,
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              <strong style={{ color: 'var(--text)' }}>쿠팡파트너스</strong> — 제휴 링크 클릭 시
              쿠팡의 쿠키 정책이 적용됩니다.{' '}
              <a
                href="https://www.coupang.com/np/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)' }}
              >
                쿠팡 개인정보처리방침
              </a>
            </li>
          </ul>
          <p style={{ ...pStyle, marginTop: '0.5rem' }}>
            이용자는{' '}
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)' }}
            >
              Google 광고 설정
            </a>
            에서 맞춤 광고를 비활성화할 수 있습니다.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. 이용자의 권리</h2>
          <p style={pStyle}>
            이용자는 언제든지 아래 권리를 행사할 수 있습니다.
          </p>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            {[
              '개인정보 열람 요청',
              '개인정보 정정·삭제 요청',
              '개인정보 처리 정지 요청',
              '뉴스레터 구독 해지 (수신된 메일의 수신거부 링크 또는 이메일 문의)',
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
          <h2 style={h2Style}>6. 개인정보 보호책임자 연락처</h2>
          <p style={pStyle}>
            개인정보 처리에 관한 문의, 불만 처리, 권리 행사는 아래 이메일로 연락해 주세요.
          </p>
          <a
            href="mailto:ghdyd6913@gmail.com"
            style={{
              display: 'inline-block',
              color: 'var(--primary)',
              fontWeight: 700,
              textDecoration: 'underline',
              fontSize: '0.95rem',
            }}
          >
            ghdyd6913@gmail.com
          </a>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. 개인정보처리방침 변경</h2>
          <p style={pStyle}>
            법령·정책 변경이나 서비스 개선을 위해 방침이 수정될 수 있습니다. 변경 시 본
            페이지에 시행일을 업데이트하여 공지합니다.
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
