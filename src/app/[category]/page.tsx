import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import ArticleCard from '@/components/ArticleCard';
import AdSense from '@/components/AdSense';

export const dynamic = 'force-dynamic';

interface Props {
  params: { category: string };
  searchParams: { page?: string };
}

const PAGE_SIZE = 12;

// 카테고리별 풍부한 SEO 메타 description 맵
const CATEGORY_META: Record<string, { title: string; description: string; keywords: string[] }> = {
  fitness: {
    title: '다이어트·운동 정보 — 3050 과학적 운동 백과',
    description: '30·40·50대를 위한 체중감량·근력운동·유산소·식단·홈트레이닝 정보. 국가공인 스포츠지도사가 알려주는 과학적 운동 지식과 오늘 당장 실천할 수 있는 다이어트 가이드.',
    keywords: ['다이어트', '운동', '체중감량', '근력운동', '홈트레이닝', '식단', '지방연소'],
  },
  health: {
    title: '운동·다이어트 건강 정보 — 과학적 운동 백과',
    description: '체중감량·근력운동·유산소·식단 정보. 과학적 근거 기반의 다이어트·운동 지식과 오늘 당장 실천할 수 있는 가이드.',
    keywords: ['다이어트', '운동', '체중감량', '근력운동', '홈트레이닝', '식단', '지방연소'],
  },
  knowledge: {
    title: '운동 지식 — 스포츠과학·영양 심화 정보',
    description: '체지방률·근섬유·VO2max·스포츠 영양 등 운동과학 심화 정보. 더 깊이 있는 다이어트·운동 지식을 탐구하세요.',
    keywords: ['스포츠과학', '운동영양', '체지방률', 'VO2max', '운동생리학'],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let category = null;
  try {
    category = await prisma.category.findUnique({
      where: { slug: params.category },
    });
  } catch {
    return {};
  }

  if (!category) return {};

  const meta = CATEGORY_META[params.category];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fitnessdic.co.kr';

  return {
    title: meta?.title || `${category.name} 글 모음 | 다이어트·운동 백과`,
    description: category.description || meta?.description || `${category.name} 관련 유용한 정보 모음. 전문가가 검토한 신뢰할 수 있는 최신 정보를 확인하세요.`,
    keywords: meta?.keywords,
    alternates: {
      canonical: `${siteUrl}/${params.category}`,
    },
    openGraph: {
      title: meta?.title || `${category.name} | 다이어트·운동 백과`,
      description: category.description || meta?.description || `${category.name} 관련 정보`,
      url: `${siteUrl}/${params.category}`,
      siteName: '다이어트·운동 백과',
      locale: 'ko_KR',
      type: 'website',
    },
  };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany();
    return categories.map((cat) => ({ category: cat.slug }));
  } catch {
    return [];
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await prisma.category.findUnique({
    where: { slug: params.category },
  });

  if (!category) notFound();

  const page = parseInt(searchParams.page || '1');
  const skip = (page - 1) * PAGE_SIZE;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED', categoryId: category.id },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.post.count({
      where: { status: 'PUBLISHED', categoryId: category.id },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '홈',
        item: process.env.NEXT_PUBLIC_SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: `${process.env.NEXT_PUBLIC_SITE_URL}/${category.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 카테고리 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <nav className="text-sm text-gray-400 mb-3">
            <a href="/" className="hover:text-primary-600">홈</a>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
          {category.description && (
            <p className="text-gray-500 mt-2">{category.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">총 {total}개의 글</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 상단 광고 */}
        <AdSense slot="category-top" format="horizontal" className="mb-8" />

        {posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>아직 글이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 1~6번 글 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.slice(0, 6).map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>

            {/* 중간 광고 */}
            {posts.length > 6 && (
              <AdSense slot="category-middle" format="horizontal" className="my-8" />
            )}

            {/* 7번 이후 글 */}
            {posts.length > 6 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.slice(6).map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-2" aria-label="페이지 탐색">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={`/${category.slug}?page=${p}`}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </a>
            ))}
          </nav>
        )}

        {/* 하단 광고 */}
        <AdSense slot="category-bottom" format="horizontal" className="mt-8" />
      </div>
    </>
  );
}
