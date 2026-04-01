/**
 * posts-queue/ 폴더의 JSON 파일을 자동으로 블로그에 등록+발행하는 스크립트
 *
 * 사용법:
 *   node scripts/process-queue.js
 *   npm run process:queue
 *
 * 동작 방식:
 *   1. posts-queue/*.json 파일 스캔
 *   2. 각 파일을 파싱해서 DB에 저장 (PUBLISHED)
 *   3. 처리된 파일은 posts-queue/processed/ 폴더로 이동
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const QUEUE_DIR     = path.join(__dirname, '..', 'posts-queue');
const PROCESSED_DIR = path.join(QUEUE_DIR, 'processed');

// ─── 슬러그 생성 ─────────────────────────────────────────────
function generateSlug(title) {
  const timestamp = Date.now();
  const simplified = title
    .replace(/[가-힣]+/g, (m) => `p${m.charCodeAt(0) % 10000}`)
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 50);
  return `${simplified}-${timestamp}`;
}

// ─── 파일 1개 처리 ───────────────────────────────────────────
async function processFile(filePath) {
  const fileName = path.basename(filePath);

  // 예시 파일은 건너뜀
  if (fileName.startsWith('예시_')) {
    return { skipped: true, reason: '예시 파일' };
  }

  let input;
  try {
    input = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return { skipped: true, reason: `JSON 파싱 오류: ${e.message}` };
  }

  // 필수 항목 확인
  if (!input.category || !input.title || !input.content) {
    return { skipped: true, reason: 'category, title, content 필수 항목 누락' };
  }

  // 카테고리 조회
  const category = await prisma.category.findUnique({
    where: { slug: input.category },
  });

  if (!category) {
    return { skipped: true, reason: `카테고리 없음: ${input.category}` };
  }

  // 읽기 시간 계산
  const textLen = input.content.replace(/<[^>]*>/g, '').length;
  const readTime = Math.max(1, Math.ceil(textLen / 500));
  const slug = generateSlug(input.title);

  // DB 저장 (즉시 발행)
  await prisma.post.create({
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt || input.title.slice(0, 100),
      content: input.content,
      keywords: JSON.stringify(input.keywords || []),
      metaTitle: input.metaTitle || input.title.slice(0, 55),
      metaDescription: input.metaDescription || '',
      readTime,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: category.id,
    },
  });

  // 처리된 파일 이동 (타임스탬프 추가)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const destName = `${timestamp}_${fileName}`;
  fs.renameSync(filePath, path.join(PROCESSED_DIR, destName));

  return { success: true, title: input.title, category: category.name };
}

// ─── 메인 ────────────────────────────────────────────────────
async function main() {
  console.log('=== 큐 처리 시작 ===');
  console.log(`폴더: ${QUEUE_DIR}\n`);

  // JSON 파일 목록 (예시 파일 제외)
  const files = fs.readdirSync(QUEUE_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('예시_'))
    .map(f => path.join(QUEUE_DIR, f));

  if (files.length === 0) {
    console.log('처리할 파일이 없습니다.');
    console.log(`posts-queue/ 폴더에 JSON 파일을 넣어주세요.`);
    console.log('\n파일 형식은 CLAUDE_PROMPT.md 를 참고하세요.');
    await prisma.$disconnect();
    return;
  }

  console.log(`${files.length}개 파일 발견\n`);

  let success = 0, skipped = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    process.stdout.write(`처리 중: ${fileName} ... `);

    const result = await processFile(filePath);

    if (result.success) {
      console.log(`✓ 발행 완료`);
      console.log(`  제목: ${result.title}`);
      console.log(`  카테고리: ${result.category}\n`);
      success++;
    } else {
      console.log(`건너뜀 (${result.reason})`);
      skipped++;
    }
  }

  await prisma.automationLog.create({
    data: {
      type: 'POST_PUBLISH',
      status: success > 0 ? 'SUCCESS' : 'PENDING',
      message: `큐 처리: ${success}개 발행, ${skipped}개 건너뜀`,
    },
  });

  console.log(`\n✅ 완료: ${success}개 발행, ${skipped}개 건너뜀`);
  if (success > 0) {
    console.log('→ http://localhost:3000 에서 확인하세요.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('오류:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
