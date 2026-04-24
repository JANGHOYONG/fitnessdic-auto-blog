/**
 * 주간 품질 감사 스크립트 (v3 기준 통합)
 * PUBLISHED 글을 v3 기준으로 재검사 — 80점 미만은 REVIEW_REQUIRED 재분류
 * 실행: node scripts/quality-audit.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SCORE_THRESHOLD = 80; // v3 기준 상향 (기존 70 → 80)

// ─── HTML 기반 v3 품질 검사 ────────────────────────────────────────────────────
// PUBLISHED 글은 DB에 HTML만 저장되므로, HTML에서 직접 v3 기준을 측정

const BANNED_PHRASES = [
  '꾸준함이 중요', '꾸준히 실천', '본인에게 맞는', '균형 있게',
  '무리하지 않는 선에서', '개인차가 있으므로', '건강에 유의',
  '좋은 방법', '도움이 됩니다', '하는 것이 좋습니다',
  '실천해 보세요', '성공의 열쇠', '본 글에서는', '본 포스팅에서는',
];

const NUMBER_PATTERN = /\d+(?:\.\d+)?(?:~\d+(?:\.\d+)?)?\s*(?:g|kg|L|ml|분|초|회|%|cm|kcal)/g;

function checkPostQualityV3(post) {
  const failed = [];
  let score = 100;

  // HTML → 텍스트 (태그 제거)
  const rawText = (post.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // 1) 이미지 (thumbnail 또는 본문 img 태그)
  const hasImage = !!post.thumbnail || (post.content || '').includes('<img');
  if (!hasImage) {
    score -= 15;
    failed.push('이미지 없음');
  }

  // 2) 금지어 블랙리스트
  let bannedCount = 0;
  for (const phrase of BANNED_PHRASES) {
    if (rawText.includes(phrase)) {
      bannedCount++;
      failed.push(`금지어: "${phrase}"`);
    }
  }
  if (bannedCount > 0) score -= Math.min(bannedCount * 10, 40);

  // 3) 수치 (g/kg/분/% 등) 10개 이상
  const numbers = rawText.match(NUMBER_PATTERN) || [];
  if (numbers.length < 10) {
    score -= 15;
    failed.push(`수치 부족 (${numbers.length}개 / 10개)`);
  }

  // 4) FAQ 섹션 존재
  const hasFaq = (post.content || '').includes('faq-item') ||
                 rawText.includes('자주 묻는') ||
                 rawText.includes('Q.') ||
                 rawText.includes('FAQ');
  if (!hasFaq) {
    score -= 10;
    failed.push('FAQ 섹션 없음');
  }

  // 5) 중단 신호 섹션 존재
  const hasStopSignal = (post.content || '').includes('stop-signals') ||
                        rawText.includes('멈추세요') ||
                        rawText.includes('이런 증상') ||
                        rawText.includes('중단하');
  if (!hasStopSignal) {
    score -= 10;
    failed.push('중단 신호 섹션 없음');
  }

  // 6) "전문가와 상담" 본문 중간 금지
  const mid90 = rawText.slice(0, rawText.length * 0.9);
  if (mid90.includes('전문가와 상담') || mid90.includes('의사와 상담')) {
    score -= 15;
    failed.push('책임 회피 구절 본문 중간 발견');
  }

  // 7) 본문 길이 (HTML 태그 제거 기준 1,800자 이상)
  if (rawText.length < 1800) {
    score -= 15;
    failed.push(`본문 짧음 (${rawText.length}자 / 1,800자)`);
  }

  // 8) 쿠팡 링크 정상
  if (post.coupangProduct) {
    try {
      const p = JSON.parse(post.coupangProduct);
      if (!p.url) { score -= 5; failed.push('쿠팡 URL 누락'); }
    } catch { score -= 5; failed.push('쿠팡 JSON 오류'); }
  }

  return { score: Math.max(0, score), reasons: failed };
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== 주간 품질 감사 시작 (v3 기준) ===\n');

  try {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true, title: true, content: true,
        thumbnail: true, coupangProduct: true, qualityScore: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 200,
    });

    console.log(`검사 대상: ${posts.length}개\n`);

    let requeued = 0, updated = 0;

    for (const post of posts) {
      const result = checkPostQualityV3(post);

      if (result.score < SCORE_THRESHOLD) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'REVIEW_REQUIRED',
            qualityScore: result.score,
            rejectReasons: result.reasons,
            reviewNotes: `[자동 품질 감사 v3] ${result.score}점 — ${result.reasons.join('; ')}`,
          },
        });
        requeued++;
        console.log(`  ⚠️  재분류: "${post.title.slice(0, 50)}" (${result.score}점)`);
        result.reasons.forEach((r) => console.log(`    - ${r}`));
      } else {
        await prisma.post.update({
          where: { id: post.id },
          data: { qualityScore: result.score },
        });
        updated++;
      }
    }

    await prisma.automationLog.create({
      data: {
        type: 'QUALITY_AUDIT',
        status: 'SUCCESS',
        message: `${posts.length}개 검사 (v3 기준) — ${requeued}개 재분류, ${updated}개 점수 업데이트`,
        details: `임계값: ${SCORE_THRESHOLD}점`,
      },
    });

    console.log(`\n✅ 완료: ${requeued}개 재분류, ${updated}개 점수 업데이트`);
  } catch (e) {
    console.error('오류:', e);
    await prisma.automationLog.create({
      data: { type: 'QUALITY_AUDIT', status: 'FAILED', message: e.message },
    }).catch(() => {});
  } finally {
    await prisma.$disconnect();
  }
}

main();
