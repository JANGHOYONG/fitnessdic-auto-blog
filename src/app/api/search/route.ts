import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ posts: [], query: q });
  }

  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { title:   { contains: q } },
        { excerpt: { contains: q } },
        { keywords:{ contains: q } },
      ],
    },
    include: { category: true },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ posts, query: q });
}
