/**
 * 완전 자동화 스케줄러
 *
 * 흐름: 키워드 수집 → 글 생성(GPT-4o-mini) → 즉시 발행
 *
 * 스케줄 (KST):
 *   - 월·목 오전 6시  : 키워드 수집 (5개 카테고리 × 20개)
 *   - 매일 오전  9시  : 글 1개 생성 + 즉시 발행
 *   - 매일 오후  1시  : 글 1개 생성 + 즉시 발행
 *   - 매일 오후  6시  : 글 1개 생성 + 즉시 발행
 *   - 매일 저녁 10시  : 글 1개 생성 + 즉시 발행
 *
 * 실행:       node scripts/scheduler.js
 * PM2:        pm2 start scripts/scheduler.js --name "blog-scheduler"
 */

require('dotenv').config();
const cron = require('node-cron');
const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const ROOT = path.resolve(__dirname, '..');

// ─── 유틸 ───────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function runScript(scriptName, args = '') {
  return new Promise((resolve, reject) => {
    const cmd = `node "${path.join(ROOT, 'scripts', scriptName)}" ${args}`;
    console.log(`[${ts()}] 실행: ${cmd}`);
    exec(cmd, { cwd: ROOT, timeout: 5 * 60 * 1000 }, (error, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (error && error.code !== 0) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

// 키워드 잔여 수 확인
async function getAvailableKeywordCount() {
  return prisma.keyword.count({ where: { used: false } });
}

// ─── 핵심: 글 생성 + 즉시 발행 ─────────────────────────────────────────────
async function generateAndPublish(label) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🚀 [${label}] 자동 발행 시작 — ${ts()}`);
  console.log('─'.repeat(50));

  try {
    // 키워드 부족 시 즉시 수집
    const kwCount = await getAvailableKeywordCount();
    if (kwCount < 5) {
      console.log(`⚠️  키워드 부족 (${kwCount}개) — 긴급 수집 시작`);
      await runScript('keyword-collector.js', '--count=20');
    }

    // 글 생성 (1개)
    console.log('\n✍️  글 생성 중 (GPT-4o-mini)...');
    await runScript('content-generator.js', '--count=1');

    // 즉시 발행
    console.log('\n📢 발행 중...');
    await runScript('publisher.js', '--mode=immediate --limit=1');

    console.log(`\n✅ [${label}] 완료 — ${ts()}`);

    await prisma.automationLog.create({
      data: { type: 'POST_PUBLISH', status: 'SUCCESS', message: `[${label}] 자동 생성+발행 완료` },
    }).catch(() => {});

  } catch (e) {
    console.error(`\n❌ [${label}] 실패: ${e.message}`);
    await prisma.automationLog.create({
      data: { type: 'POST_PUBLISH', status: 'FAILED', message: `[${label}] ${e.message}` },
    }).catch(() => {});
  }
}

// ─── 스케줄 1: 키워드 수집 — 월·목 오전 6시 ────────────────────────────────
cron.schedule('0 6 * * 1,4', async () => {
  console.log(`\n📌 [${ts()}] 키워드 수집 시작`);
  try {
    await runScript('keyword-collector.js', '--count=20');
    const total = await getAvailableKeywordCount();
    console.log(`✅ 키워드 수집 완료 — 잔여 ${total}개`);
  } catch (e) {
    console.error(`❌ 키워드 수집 실패: ${e.message}`);
  }
}, { timezone: 'Asia/Seoul' });

// ─── 스케줄 2~5: 글 생성 + 발행 ─────────────────────────────────────────────
cron.schedule('0 9  * * *', () => generateAndPublish('오전 9시'),  { timezone: 'Asia/Seoul' });
cron.schedule('0 13 * * *', () => generateAndPublish('오후 1시'),  { timezone: 'Asia/Seoul' });
cron.schedule('0 18 * * *', () => generateAndPublish('오후 6시'),  { timezone: 'Asia/Seoul' });
cron.schedule('0 22 * * *', () => generateAndPublish('저녁 10시'), { timezone: 'Asia/Seoul' });

// ─── 시작 메시지 ─────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════╗');
console.log('║  🤖 완전 자동화 블로그 스케줄러 시작         ║');
console.log('╠══════════════════════════════════════════════╣');
console.log('║  📌 월·목 오전 6시   : 키워드 수집          ║');
console.log('║  🌅 매일 오전  9시   : 글 생성 + 발행       ║');
console.log('║  ☀️  매일 오후  1시   : 글 생성 + 발행       ║');
console.log('║  🌆 매일 오후  6시   : 글 생성 + 발행       ║');
console.log('║  🌙 매일 저녁 10시   : 글 생성 + 발행       ║');
console.log('╠══════════════════════════════════════════════╣');
console.log('║  💰 비용: 글 1개당 약 $0.02 (약 30원)       ║');
console.log('║     하루 4개 × 30일 = 약 3,600원/월         ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`\n현재 시각: ${ts()}`);
console.log('pm2 stop blog-scheduler 으로 종료\n');

// ─── 프로세스 유지 ───────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n스케줄러 종료 중...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`[${ts()}] 예상치 못한 오류:`, err.message);
  prisma.automationLog.create({
    data: { type: 'ERROR', status: 'FAILED', message: err.message },
  }).catch(() => {});
});
