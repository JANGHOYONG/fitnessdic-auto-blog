/**
 * 쿠팡파트너스 상품 카드 — 사이드바 sticky 전용
 * 이미지·가격이 없어도 우아하게 렌더링
 */

export interface CoupangProduct {
  name: string;
  url: string;
  image?: string;
  price?: string;
  ctaText?: string;
}

interface Props {
  product: CoupangProduct;
}

// 주제별 대표 이모지 (이미지 없을 때 플레이스홀더)
const TOPIC_EMOJI: Record<string, string> = {
  '단백질': '🥩', '프로틴': '🥩', '닭가슴살': '🥩',
  '다이어트': '🔥', '체중': '🔥', '지방': '🔥', '살빼기': '🔥',
  '근력': '💪', '헬스': '💪', '웨이트': '💪', '근육': '💪',
  '유산소': '🏃', '러닝': '🏃', '달리기': '🏃',
  '홈트': '🏠', '맨몸': '🏠', '매트': '🏠',
  '영양제': '💊', '비타민': '💊', '오메가': '💊',
  '크레아틴': '⚡', 'bcaa': '⚡', 'BCAA': '⚡',
  '운동화': '👟', '러닝화': '👟', '운동복': '👟',
};

function getEmoji(ctaText = '', name = '') {
  const text = ctaText + name;
  for (const [kw, emoji] of Object.entries(TOPIC_EMOJI)) {
    if (text.includes(kw)) return emoji;
  }
  return '🛒';
}

export default function CoupangProductCard({ product }: Props) {
  const { name, url, image, price, ctaText } = product;
  const emoji = getEmoji(ctaText, name);

  return (
    <div
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1.5px solid var(--border)',
        background: 'var(--bg)',
        boxShadow: '0 2px 12px rgba(30,158,122,0.08)',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: 'linear-gradient(90deg, #B09070 0%, #8B7050 100%)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>🛒</span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px' }}>
            {ctaText || '추천 운동 제품'}
          </span>
        </div>
        <span
          style={{
            background: '#B09070',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '20px',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          🔥 오늘의 특가
        </span>
      </div>

      {/* 상품 정보 */}
      <a
        href={url}
        target="_blank"
        rel="noopener sponsored"
        style={{ display: 'block', textDecoration: 'none', padding: '12px' }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          {/* 이미지 or 플레이스홀더 */}
          {image ? (
            <img
              src={image}
              alt={name}
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'contain',
                borderRadius: '10px',
                flexShrink: 0,
                background: '#fff',
                border: '1px solid var(--border)',
              }}
            />
          ) : (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #FFF0E8 0%, #FDDBC4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                flexShrink: 0,
                border: '1px solid var(--border)',
              }}
            >
              {emoji}
            </div>
          )}

          {/* 텍스트 정보 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.4,
                marginBottom: '6px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {name}
            </p>

            {price && (
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#E53E3E', marginBottom: '5px' }}>
                {price}
              </p>
            )}

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#2B6CB0',
                background: '#EBF8FF',
                padding: '2px 7px',
                borderRadius: '20px',
              }}
            >
              🚀 로켓배송
            </span>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div
          style={{
            marginTop: '10px',
            background: 'linear-gradient(90deg, #B09070 0%, #C4A882 100%)',
            borderRadius: '10px',
            padding: '9px',
            textAlign: 'center',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          쿠팡에서 보기 →
        </div>
      </a>

      {/* 파트너스 고지 */}
      <p
        style={{
          fontSize: '10px',
          color: '#AAAAAA',
          textAlign: 'center',
          padding: '0 12px 10px',
          lineHeight: 1.5,
        }}
      >
        이 포스팅은 쿠팡 파트너스 활동의 일환으로,
        <br />이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
