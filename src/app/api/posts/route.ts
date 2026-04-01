import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 내부 API: 게시글 목록 (RSS, 사이트맵 갱신 등 활용)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '10');
  const page = parseInt(searchParams.get('page') || '1');

  const where = {
    status: 'PUBLISHED' as const,
    ...(category && { category: { slug: category } }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}
