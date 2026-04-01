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

  // 리다이렉트 (www → non-www 또는 반대)
  async redirects() {
    return [
      // 필요 시 www 리다이렉트 추가
    ];
  },
};

module.exports = nextConfig;
