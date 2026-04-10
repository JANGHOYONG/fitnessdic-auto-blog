import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Smart Info Blog';

export const dynamic = 'force-dynamic';

export async function GET() {
  let posts: Awaited<ReturnType<typeof prisma.post.findMany<{ include: { category: true } }>>> = [];
  try {
    posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      take: 30,
    });
  } catch {
    // DB 미연결 시 빈 RSS 반환
  }

  const rssItems = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/${post.category.slug}/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/${post.category.slug}/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${post.publishedAt?.toUTCString()}</pubDate>
      <category><![CDATA[${post.category.name}]]></category>
    </item>`
    )
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>유용한 정보 블로그</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/rss" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
