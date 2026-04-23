/**
 * 주간 품질 감사 스크립트
 * PUBLISHED 글 중 점수 70점 미만을 REVIEW_REQUIRED로 재분류
 * 실행: node scripts/quality-audit.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { runQualityGate } = require('./quality-gate');

const prisma = new PrismaClient();
const SCORE_THRESHOLD = 70;

async function main() {
  console.log('=== 주간 품질 감사 시작 ===');

  try {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, content: true, thumbnail: true, coupangProduct: true, qualityScore: true },
      orderBy: { publishedAt: 'desc' },
      take: 200,
    });

    console.log(`검사 대상: ${posts.length}개`);

    let requeued = 0;
    for (const post of posts) {
      const gate = runQualityGate(post);
      if (gate.score < SCORE_THRESHOLD) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'REVIEW_REQUIRED',
            qualityScore: gate.score,
            rejectReasons: gate.reasons,
            reviewNotes: `[자동 품질 감사] 점수 ${gate.score}점 — ${gate.reasons.join('; ')}`,
          },
        });
        requeued++;
        console.log(`  ⚠️ 재분류: "${post.title}" (${gate.score}점)`);
        gate.reasons.forEach((r) => console.log(`    - ${r}`));
      } else {
        // 점수 업데이트만
        await prisma.post.update({
          where: { id: post.id },
          data: { qualityScore: gate.score },
        });
      }
    }

    await prisma.automationLog.create({
      data: {
        type: 'QUALITY_AUDIT',
        status: 'SUCCESS',
        message: `${posts.length}개 검사, ${requeued}개 REVIEW_REQUIRED 재분류`,
      },
    });

    console.log(`\n✅ 완료: ${requeued}개 재분류`);
  } catch (e) {
    console.error('오류:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
