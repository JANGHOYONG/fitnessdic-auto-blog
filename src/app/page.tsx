import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { generateJsonLd } from '@/lib/seo';
import ArticleCard from '@/components/ArticleCard';
import SkeletonCard from '@/components/SkeletonCard';
import TopBar from '@/components/TopBar';
import AdSense from '@/components/AdSense';
import NewsletterCTA from '@/components/NewsletterCTA';
import DailyHealthTip from '@/components/DailyHealthTip';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '다이어트·운동 백과 — 30·40·50대를 위한 과학적 다이어트·운동 가이드',
  description: '체중감량·근력운동·유산소·식단·홈트레이닝·다이어트 식품 정보. 국가공인 스포츠지도사가 알려주는 과학적 다이어트·운동 백과사전.',
  keywords: ['다이어트', '운동', '체중감량', '근력운동', '홈트레이닝', '식단', '단백질', '지방연소'],
  openGraph: {
    title: '다이어트·운동 백과',
    description: '30·40·50대를 위한 과학적 다이어트·운동 가이드',
    url: 'https://smartinfohealth.co.kr',
    siteName: '다이어트·운동 백과',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default async function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentPosts: any[] = [];
  try {
    recentPosts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    });
  } catch {
    // DB 미연결 시 빈 목록
  }

  const jsonLd = generateJsonLd({
    type: 'WebSite',
    title: '다이어트·운동 백과',
    description: '30·40·50대를 위한 과학적 다이어트·운동 가이드',
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 방문자 통계 + 인기글 바 */}
      <Suspense fallback={null}>
        <TopBar />
      </Suspense>

      {/* 오늘의 건강 궁금증 */}
      <Suspense fallback={null}>
        <DailyHealthTip />
      </Suspense>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* 상단 광고 */}
        <div className="mb-8">
          <AdSense slot="top-banner" format="horizontal" />
        </div>

        {/* 최신 글 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>최신 건강 정보</h2>
          <Link href="/health" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
            전체 보기 →
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-2xl mb-3">✍️</p>
            <p className="font-medium" style={{ color: 'var(--text-muted)' }}>아직 게시된 글이 없습니다.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>곧 새 글이 업로드됩니다!</p>
          </div>
        ) : (
          <Suspense fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          }>
            {/* 1~4번 글 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentPosts.slice(0, 4).map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>

            {/* 뉴스레터 CTA */}
            <NewsletterCTA className="my-8" />

            {/* 5~8번 글 */}
            {recentPosts.length > 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {recentPosts.slice(4, 8).map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {/* 중간 광고 */}
            {recentPosts.length > 8 && (
              <div className="my-8">
                <AdSense slot="home-middle" format="horizontal" />
              </div>
            )}

            {/* 9~12번 글 */}
            {recentPosts.length > 8 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentPosts.slice(8, 12).map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </Suspense>
        )}
      </div>
    </>
  );
}
