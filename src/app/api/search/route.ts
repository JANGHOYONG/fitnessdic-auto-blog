import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ posts: [], query: q });
  }

  try {
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
  } catch {
    return NextResponse.json({ posts: [], query: q });
  }
}
