import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import ArticleCard from '@/components/ArticleCard';
import AdSense from '@/components/AdSense';

export const revalidate = 3600;

interface Props {
  params: { category: string };
  searchParams: { page?: string };
}

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await prisma.category.findUnique({
    where: { slug: params.category },
  });

  if (!category) return {};

  return {
    title: `${category.name} 글 모음`,
    description: category.description || `${category.name} 관련 유용한 정보 모음`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/${params.category}`,
    },
  };
}

export async function generateStaticParams() {
  const categories = await prisma.category.findMany();
  return categories.map((cat) => ({ category: cat.slug }));
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
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
