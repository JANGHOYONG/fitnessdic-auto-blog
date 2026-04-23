import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

    const post = await prisma.post.findUnique({ where: { id: Number(postId) }, select: { status: true } });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (post.status !== 'REVIEW_REQUIRED') {
      return NextResponse.json({ error: `Cannot approve from status: ${post.status}` }, { status: 400 });
    }

    const updated = await prisma.post.update({
      where: { id: Number(postId) },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });

    return NextResponse.json({ success: true, id: updated.id, status: updated.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
