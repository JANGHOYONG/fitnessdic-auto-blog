require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { runQualityGate } = require('./quality-gate');

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    where: { status: 'DRAFT' },
    select: { id: true, title: true, content: true, thumbnail: true, coupangProduct: true },
  });

  console.log(`DRAFT 글 ${posts.length}개 → REVIEW_REQUIRED 이동 중...\n`);

  for (const post of posts) {
    const gate = runQualityGate(post);
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'REVIEW_REQUIRED',
        qualityScore: gate.score,
        rejectReasons: gate.reasons,
      },
    });
    console.log(`[${gate.score}점] ${post.title.slice(0, 50)}`);
    if (gate.reasons.length) {
      gate.reasons.forEach((r) => console.log(`  - ${r}`));
    }
  }

  console.log(`\n완료: ${posts.length}개 감수 큐로 이동`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
