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

  // 리다이렉트 — 잘못된 구 카테고리 슬러그 → 올바른 신 카테고리로 301
  // (구: diet/exercise/running/fitness/health/knowledge → 신: weightloss/strength/cardio 등)
  async redirects() {
    return [
      { source: '/diet/:path*',      destination: '/weightloss/:path*',   permanent: true },
      { source: '/exercise/:path*',  destination: '/strength/:path*',     permanent: true },
      { source: '/running/:path*',   destination: '/cardio/:path*',       permanent: true },
      { source: '/fitness/:path*',   destination: '/strength/:path*',     permanent: true },
      { source: '/diet',             destination: '/weightloss',          permanent: true },
      { source: '/exercise',         destination: '/strength',            permanent: true },
      { source: '/running',          destination: '/cardio',              permanent: true },
      { source: '/fitness',          destination: '/strength',            permanent: true },
      // 어드민 로그인 페이지 → 바로 감수 큐로
      { source: '/admin/login',      destination: '/admin/review',        permanent: false },
    ];
  },
};

module.exports = nextConfig;
