import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || 'https://smartinfohealth.co.kr';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '다이어트·운동 백과';
const SITE_DESC = '30·40·50대를 위한 과학적 다이어트·운동 가이드';

export async function GET() {
  let posts: {
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: Date | null;
    category: { slug: string; name: string };
  }[] = [];

  try {
    posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        category: { select: { slug: true, name: true } },
      },
    });
  } catch {
    // DB 미연결 시 빈 피드 반환
  }

  const items = posts
    .map((post) => {
      const url     = `${SITE_URL}/${post.category.slug}/${post.slug}`;
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : new Date().toUTCString();
      const desc = (post.excerpt ?? '').replace(/[<>&'"]/g, (c) =>
        ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c)
      );
      const title = post.title.replace(/[<>&'"]/g, (c) =>
        ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c)
      );

      return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${desc}</description>
      <category>${post.category.name}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESC}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
