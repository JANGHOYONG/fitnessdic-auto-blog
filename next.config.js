/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 내보내기 비활성화 - 동적 라우팅 및 ISR 사용
  output: undefined,

  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // SEO: 후행 슬래시 통일
  trailingSlash: false,

  // 압축
  compress: true,

  // 헤더 설정 (보안 + SEO)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // 리다이렉트 — 기존 카테고리 URL 보존 (링크주스 유지)
  async redirects() {
    return [
      // 기존 카테고리 → 새 카테고리 301 리다이렉트
      { source: '/weightloss/:path*', destination: '/diet/:path*',         permanent: true },
      { source: '/strength/:path*',   destination: '/exercise/:path*',     permanent: true },
      { source: '/cardio/:path*',     destination: '/running/:path*',      permanent: true },
      // 단일 슬러그 리다이렉트
      { source: '/weightloss',        destination: '/diet',                permanent: true },
      { source: '/strength',          destination: '/exercise',            permanent: true },
      { source: '/cardio',            destination: '/running',             permanent: true },
    ];
  },
};

module.exports = nextConfig;
