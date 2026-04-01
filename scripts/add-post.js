/**
 * 수동 글 등록 스크립트
 * Claude 채팅으로 생성한 글을 블로그 DB에 등록합니다.
 *
 * 사용법:
 *   1. post-input.json 파일에 글 내용 입력
 *   2. node scripts/add-post.js
 *   3. node scripts/publisher.js --mode=immediate
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const INPUT_FILE = path.join(__dirname, 'post-input.json');

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

async function main() {
  // post-input.json 없으면 샘플 생성
  if (!fs.existsSync(INPUT_FILE)) {
    const sample = {
      _안내: "이 파일을 채워서 node scripts/add-post.js 를 실행하세요.",
      category: "tech",
      title: "여기에 글 제목 입력",
      metaTitle: "검색 결과에 표시될 제목 (55자 이내)",
      metaDescription: "검색 결과 설명 (140~155자)",
      excerpt: "글 요약 (100~130자)",
      keywords: ["키워드1", "키워드2", "키워드3"],
      content: "<article><section class='intro'><p>서론...</p></section><section><h2>소제목1</h2><p>본문...</p></section></article>"
    };
    fs.writeFileSync(INPUT_FILE, JSON.stringify(sample, null, 2), 'utf-8');
    console.log(`✅ 샘플 파일 생성: scripts/post-input.json`);
    console.log('   파일을 열어 내용을 채운 후 다시 실행하세요.');
    return;
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

  // 유효성 검사
  const required = ['category', 'title', 'content'];
  for (const field of required) {
    if (!input[field]) {
      console.error(`✗ 필수 항목 누락: ${field}`);
      process.exit(1);
    }
  }

  // 카테고리 조회
  const category = await prisma.category.findUnique({
    where: { slug: input.category },
  });

  if (!category) {
    const categories = await prisma.category.findMany({ select: { slug: true, name: true } });
    console.error(`✗ 카테고리 없음: "${input.category}"`);
    console.error('  사용 가능:', categories.map(c => `${c.slug}(${c.name})`).join(', '));
    process.exit(1);
  }

  // 읽기 시간 계산
  const textLen = input.content.replace(/<[^>]*>/g, '').length;
  const readTime = Math.max(1, Math.ceil(textLen / 500));

  const slug = generateSlug(input.title);

  // DB 저장
  const post = await prisma.post.create({
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt || input.title,
      content: input.content,
      keywords: JSON.stringify(input.keywords || []),
      metaTitle: input.metaTitle || input.title,
      metaDescription: input.metaDescription || input.excerpt || '',
      readTime,
      status: 'DRAFT',
      categoryId: category.id,
    },
  });

  console.log(`\n✅ 글 등록 완료!`);
  console.log(`   제목: ${post.title}`);
  console.log(`   카테고리: ${category.name}`);
  console.log(`   읽기시간: ${readTime}분`);
  console.log(`   상태: DRAFT\n`);
  console.log('발행하려면:');
  console.log('   node scripts/publisher.js --mode=immediate');

  // 입력 파일 초기화 (다음 사용을 위해)
  fs.writeFileSync(INPUT_FILE, JSON.stringify({
    _안내: "이 파일을 채워서 node scripts/add-post.js 를 실행하세요.",
    category: "tech",
    title: "",
    metaTitle: "",
    metaDescription: "",
    excerpt: "",
    keywords: [],
    content: ""
  }, null, 2), 'utf-8');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
