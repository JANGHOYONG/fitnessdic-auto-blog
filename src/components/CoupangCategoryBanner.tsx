'use client';

/**
 * 쿠팡파트너스 상품 배너 — 전체 상품 중 랜덤 3개 노출
 */

import { useMemo } from 'react';

interface Product {
  name: string;
  url: string;
  image: string;
  price: string;
}

const ALL_PRODUCTS: Product[] = [
  { name: '알파CD 분말 식약청인증 HACCP 다이어트 뉴린스', url: 'https://link.coupang.com/a/el3FDo', image: 'https://t1a.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/8123/8aec77cfe2ed11cb86eef5bb971606c9d5be2a7a711fc5bc05238113edb5.jpg', price: '₩35,000' },
  { name: '잇더핏 단백질 쉐이크 8종', url: 'https://link.coupang.com/a/el3ICx', image: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/23ca/75ebcc9e47d63fc2d67ba00878cff97ab7ddc9ac12b040bca3ada5401e50.png', price: '₩29,900' },
  { name: '굽네 UNDER 도시락 5종 세트', url: 'https://link.coupang.com/a/el3OyJ', image: 'https://t3c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/13688958151196-e892591a-b3c4-47f5-83ad-a1ceb5641b76.jpg', price: '₩26,860' },
  { name: '곰곰 곤약 도시락 6종 세트', url: 'https://link.coupang.com/a/el3Qua', image: 'https://t2c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/1856759219616059-02107649-e25d-49a3-b59a-98a34a679699.jpg', price: '₩18,150' },
  { name: '락토핏 정품 다이어트 유산균', url: 'https://link.coupang.com/a/emolj0', image: 'https://thumbnail14.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2025/01/08/11/2/a35ab0df-94b5-4a99-8d20-6bd818d0d55b.jpg', price: '₩18,700' },
  { name: '오늘부터 웰컷, 30회분', url: 'https://link.coupang.com/a/emomvE', image: 'https://thumbnail9.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/14305712308606-52f14031-58ee-436b-bf1d-aeb3a2703f71.jpg', price: '₩12,800' },
  { name: '국물까지 다먹어도 79kcal', url: 'https://link.coupang.com/a/emoobP', image: 'https://thumbnail7.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/045a/c17d7ba6b30bb04c8c38a4c79ac733aff9278b0ae9f1ed64a00bf90f9569.png', price: '₩9,900' },
  { name: '혜인담 식사대용 단백질 쉐이크 5개', url: 'https://link.coupang.com/a/emopZi', image: 'https://thumbnail9.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/prod/488b1da8-1db2-4ca2-a943-7012f6777c0a_fixing_v2.png', price: '₩12,900' },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CoupangCategoryBanner({ categorySlug }: { categorySlug: string }) {
  const products = useMemo(() => {
    const shuffled = [...ALL_PRODUCTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  return (
    <div style={{ margin: '2rem 0' }}>
      <div style={{
        background: 'linear-gradient(90deg, #E8631A 0%, #C4501A 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>🛒 관련 상품 추천</span>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px' }}>쿠팡파트너스</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
      }}>
        {products.map((p, i) => (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener sponsored"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 8px',
              background: 'var(--bg)',
              textDecoration: 'none',
              gap: '6px',
            }}
          >
            <img
              src={p.image}
              alt={p.name}
              style={{
                width: '72px',
                height: '72px',
                objectFit: 'contain',
                borderRadius: '8px',
                background: '#fff',
                border: '1px solid var(--border)',
              }}
            />
            <p style={{
              fontSize: '11px',
              color: 'var(--text)',
              textAlign: 'center',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              margin: 0,
              fontWeight: 500,
            }}>
              {p.name}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#E53E3E', margin: 0 }}>
              {p.price}
            </p>
            <span style={{
              fontSize: '11px',
              background: 'linear-gradient(90deg, #E8631A, #C4501A)',
              color: '#fff',
              borderRadius: '20px',
              padding: '3px 10px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              바로가기 →
            </span>
          </a>
        ))}
      </div>

      <p style={{ fontSize: '10px', color: '#AAAAAA', textAlign: 'center', marginTop: '6px', lineHeight: 1.5 }}>
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
