import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const today = () => new Date().toISOString().slice(0, 10);

// GET: 통계 조회
export async function GET() {
  const todayStr = today();

  const [todayRow, totals] = await Promise.all([
    prisma.visitor.findUnique({ where: { date: todayStr } }),
    prisma.visitor.aggregate({ _sum: { count: true, unique: true } }),
  ]);

  return NextResponse.json({
    todayViews:  todayRow?.count  ?? 0,
    todayUnique: todayRow?.unique ?? 0,
    totalViews:  totals._sum.count  ?? 0,
    totalUnique: totals._sum.unique ?? 0,
  });
}

// POST: 방문 기록
export async function POST(req: NextRequest) {
  const { isUnique } = await req.json();
  const todayStr = today();

  await prisma.visitor.upsert({
    where: { date: todayStr },
    update: {
      count:  { increment: 1 },
      unique: { increment: isUnique ? 1 : 0 },
    },
    create: {
      date:   todayStr,
      count:  1,
      unique: isUnique ? 1 : 0,
    },
  });

  return NextResponse.json({ ok: true });
}
