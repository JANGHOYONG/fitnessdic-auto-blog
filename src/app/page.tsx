import Link from 'next/link';
import { prisma } from '@/lib/db';
import { generateJsonLd } from '@/lib/seo';
import ArticleCard from '@/components/ArticleCard';
import AdSense from '@/components/AdSense';
import VisitorStats from '@/components/VisitorStats';
import SkeletonCard from '@/components/SkeletonCard';
import { Suspense } from 'react';

export const revalidate = 1800;

const CAT_COLORS: Record<string, string> = {
  health: 'bg-green-100 text-green-700', tech: 'bg-blue-100 text-blue-700',
  economy: 'bg-yellow-100 text-yellow-700', lifestyle: 'bg-pink-100 text-pink-700',
  travel: 'bg-purple-100 text-purple-700',
};

export default async function HomePage() {
  const [recentPosts, popularPosts, categories] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true },
      orderBy: { viewCount: 'desc' },
      take: 5,
    }),
    prisma.category.findMany({
      include: { _count: { select: { posts: { where: { status: 'PUBLISHED' } } } } },
    }),
  ]);

  const jsonLd = generateJsonLd({
    type: 'WebSite',
    title: process.env.NEXT_PUBLIC_SITE_NAME || 'Smart Info Blog',
    description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '유용한 정보 블로그',
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 히어로 */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #0f172a 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            {process.env.NEXT_PUBLIC_SITE_NAME || 'Smart Info Blog'}
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            건강, IT, 경제, 생활정보까지 — 당신의 일상을 바꾸는 유용한 정보
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/${cat.slug}`}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white font-medium transition-all text-sm">
                {cat.name} <span className="opacity-70">({cat._count.posts})</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 상단 광고 */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <AdSense slot="top-banner" format="horizontal" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 최신 글 */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <span className="w-1 h-7 rounded-full inline-block" style={{ background: 'var(--primary)' }} />
              최신 글
            </h2>
            {recentPosts.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <p>아직 게시된 글이 없습니다.</p>
                <p className="text-sm mt-2">posts-queue 폴더에 글을 추가하세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentPosts.map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          {/* 사이드바 */}
          <aside className="space-y-5">
            {/* 방문자 통계 */}
            <Suspense fallback={null}>
              <VisitorStats />
            </Suspense>

            {/* 인기 글 */}
            <div className="card p-5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                🔥 인기 글
              </h3>
              <ol className="space-y-3">
                {popularPosts.map((post, idx) => (
                  <li key={post.id} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'var(--primary)' }}>
                      {idx + 1}
                    </span>
                    <Link href={`/${post.category.slug}/${post.slug}`}
                      className="text-sm leading-snug line-clamp-2 hover:opacity-75 transition-opacity"
                      style={{ color: 'var(--text)' }}>
                      {post.title}
                    </Link>
                  </li>
                ))}
                {popularPosts.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>아직 인기 글이 없습니다.</p>
                )}
              </ol>
            </div>

            {/* 카테고리 */}
            <div className="card p-5">
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text)' }}>카테고리</h3>
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/${cat.slug}`}
                      className="flex justify-between items-center py-2 px-3 rounded-lg transition-colors hover:opacity-75"
                      style={{ color: 'var(--text)' }}>
                      <span>{cat.name}</span>
                      <span className={`category-badge text-xs ${CAT_COLORS[cat.slug] || 'bg-gray-100 text-gray-600'}`}>
                        {cat._count.posts}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 사이드바 광고 */}
            <AdSense slot="sidebar" format="rectangle" />

            {/* About 링크 */}
            <div className="card p-5 text-center">
              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>이 블로그에 대해 궁금하신가요?</p>
              <Link href="/about" className="btn-primary inline-block text-sm">
                블로그 소개 보기
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
