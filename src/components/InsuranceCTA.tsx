/**
 * 보험·건강검진 제휴 CTA 컴포넌트 (다이어트·운동 백과)
 * 환경변수: NEXT_PUBLIC_INSURANCE_LINK, NEXT_PUBLIC_HEALTH_CHECK_LINK
 */

interface Props {
  type?: 'insurance' | 'healthcheck' | 'both';
  topicId?: string;
}

const TOPIC_CTA: Record<string, { insurance: string; check: string }> = {
  weightloss:   { insurance: '비만·대사질환 대비 건강보험 무료 비교', check: '체성분·대사 정밀 검진 알아보기' },
  strength:     { insurance: '근골격계 부상 대비 보험 무료 비교', check: '근육·관절 정밀 검진 알아보기' },
  cardio:       { insurance: '심혈관·유산소 건강 보험 무료 비교', check: '심폐기능 정밀 검진 알아보기' },
  nutrition:    { insurance: '영양 결핍·만성질환 대비 보험 무료 비교', check: '혈액·영양 정밀 검진 알아보기' },
  hometraining: { insurance: '운동 부상 대비 건강보험 무료 비교', check: '체력·체성분 검진 알아보기' },
  motivation:   { insurance: '내 나이·목표 맞춤 건강보험 무료 비교', check: '건강 종합 검진 비교하기' },
  default:      { insurance: '내 나이·상태 맞춤 건강보험 무료 비교', check: '종합건강검진 패키지 비교하기' },
};

export default function InsuranceCTA({ type = 'both', topicId = 'default' }: Props) {
  const insuranceLink = process.env.NEXT_PUBLIC_INSURANCE_LINK || '';
  const healthCheckLink = process.env.NEXT_PUBLIC_HEALTH_CHECK_LINK || '';

  const cta = TOPIC_CTA[topicId] || TOPIC_CTA.default;
  const showInsurance = (type === 'insurance' || type === 'both') && insuranceLink;
  const showCheck = (type === 'healthcheck' || type === 'both') && healthCheckLink;

  if (!showInsurance && !showCheck) return null;

  return (
    <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid #fdba74', borderRadius: '12px' }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.75rem' }}>
        📋 이 글을 읽으셨다면 확인해보세요
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {showInsurance && (
          <a href={insuranceLink} target="_blank" rel="noopener noreferrer sponsored"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '8px', textDecoration: 'none', color: '#c2410c', fontWeight: 600, fontSize: '0.95rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <span>{cta.insurance}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.7 }}>→</span>
          </a>
        )}
        {showCheck && (
          <a href={healthCheckLink} target="_blank" rel="noopener noreferrer sponsored"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '8px', textDecoration: 'none', color: '#c2410c', fontWeight: 600, fontSize: '0.95rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🏥</span>
            <span>{cta.check}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.7 }}>→</span>
          </a>
        )}
      </div>
      <p style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.75rem', marginBottom: 0 }}>
        * 파트너 링크를 통한 가입·신청 시 소정의 수수료가 발생할 수 있습니다.
      </p>
    </div>
  );
}
