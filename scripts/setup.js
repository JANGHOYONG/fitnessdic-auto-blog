/**
 * 초기 설정 스크립트
 * - DB 마이그레이션
 * - 시드 데이터 삽입
 * - 환경 확인
 *
 * 실행: node scripts/setup.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

function run(cmd, desc) {
  console.log(`\n▶ ${desc}...`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    console.log(`  ✓ 완료`);
  } catch (e) {
    console.error(`  ✗ 실패: ${e.message}`);
    throw e;
  }
}

function checkEnv() {
  console.log('\n🔍 환경변수 확인...');
  const required = ['OPENAI_API_KEY', 'DATABASE_URL'];
  const optional = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SITE_NAME',
    'NEXT_PUBLIC_ADSENSE_CLIENT_ID',
    'NEXT_PUBLIC_GA_MEASUREMENT_ID',
  ];

  let hasError = false;

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`  ✗ 필수: ${key} 미설정`);
      hasError = true;
    } else {
      console.log(`  ✓ ${key}`);
    }
  }

  for (const key of optional) {
    if (!process.env[key]) {
      console.warn(`  ⚠️  권장: ${key} 미설정 (나중에 설정 가능)`);
    } else {
      console.log(`  ✓ ${key}`);
    }
  }

  return !hasError;
}

async function main() {
  console.log('╔════════════════════════════════╗');
  console.log('║  SEO 자동 블로그 초기 설정     ║');
  console.log('╚════════════════════════════════╝');

  // .env 파일 확인
  if (!fs.existsSync(path.join(ROOT, '.env'))) {
    console.log('\n⚠️  .env 파일이 없습니다.');
    console.log('   .env.example을 복사하여 .env를 만들고 값을 설정하세요:');
    console.log('   cp .env.example .env\n');

    if (!process.env.ANTHROPIC_API_KEY) {
      process.exit(1);
    }
  }

  // 환경변수 확인
  const envOk = checkEnv();
  if (!envOk) {
    console.error('\n✗ 필수 환경변수를 설정한 후 다시 실행하세요.');
    process.exit(1);
  }

  // Prisma 클라이언트 생성
  run('npx prisma generate', 'Prisma 클라이언트 생성');

  // DB 마이그레이션
  run('npx prisma db push', 'DB 스키마 적용');

  // 시드 데이터
  run('npx ts-node prisma/seed.ts', '초기 데이터 삽입');

  console.log('\n╔════════════════════════════════╗');
  console.log('║  설정 완료! 다음 단계:         ║');
  console.log('╚════════════════════════════════╝');
  console.log('');
  console.log('1. 키워드 수집:');
  console.log('   npm run collect:keywords');
  console.log('');
  console.log('2. 콘텐츠 생성:');
  console.log('   npm run generate:content');
  console.log('');
  console.log('3. 발행:');
  console.log('   npm run publish:posts');
  console.log('');
  console.log('4. 개발 서버:');
  console.log('   npm run dev  →  http://localhost:3000');
  console.log('');
  console.log('5. 자동화 시작 (24시간):');
  console.log('   npm run scheduler:start');
  console.log('   (또는) pm2 start scripts/scheduler.js --name blog-auto');
  console.log('');
}

main().catch((e) => {
  console.error('설정 실패:', e);
  process.exit(1);
});
