import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: { slug: string; updatedAt: Date; category: { slug: string } }[] = [];
  let categories: { slug: string; updatedAt: Date }[] = [];

  try {
    [posts, categories] = await Promise.all([
      prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true, category: { select: { slug: true } } },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ]);
  } catch {
    // DB 미연결 시 기본 sitemap만 반환
  }

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/${post.category.slug}/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...categoryUrls,
    ...postUrls,
  ];
}
