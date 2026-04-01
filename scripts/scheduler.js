/**
 * 자동화 스케줄러 - 하루 4회 발행
 *
 * 발행 시각 (KST):
 *   - 오전  9:00
 *   - 오후  1:00 (13:00)
 *   - 오후  6:00 (18:00)
 *   - 저녁 10:00 (22:00)
 *
 * 키워드 수집: 월/목 오전 7시
 *
 * 실행:       node scripts/scheduler.js
 * PM2 백그라운드: pm2 start scripts/scheduler.js --name "blog-scheduler"
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
    console.log(`\n[${ts()}] 실행: ${cmd}`);
    exec(cmd, { cwd: ROOT }, (error, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (error && error.code !== 0) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

async function processQueue() {
  console.log(`\n📤 [${ts()}] posts-queue 처리 시작`);
  try {
    await runScript('process-queue.js');
    console.log(`✅ [${ts()}] posts-queue 처리 완료`);
  } catch (e) {
    console.error(`❌ posts-queue 처리 실패: ${e.message}`);
    await prisma.automationLog.create({
      data: { type: 'PUBLISH', status: 'FAILED', message: e.message },
    }).catch(() => {});
  }
}

// ─── 스케줄 1: 키워드 수집 — 월·목 오전 7시 ────────────────────────────────
cron.schedule('0 7 * * 1,4', async () => {
  console.log(`\n📌 [${ts()}] 키워드 수집 시작`);
  try {
    await runScript('keyword-collector.js', '--count=20');
    console.log(`✅ [${ts()}] 키워드 수집 완료`);
  } catch (e) {
    console.error(`❌ 키워드 수집 실패: ${e.message}`);
  }
}, { timezone: 'Asia/Seoul' });

// ─── 스케줄 2: 발행 — 오전 9시 ─────────────────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  console.log(`\n🌅 [${ts()}] [오전 9시] 발행 시작`);
  await processQueue();
}, { timezone: 'Asia/Seoul' });

// ─── 스케줄 3: 발행 — 오후 1시 ─────────────────────────────────────────────
cron.schedule('0 13 * * *', async () => {
  console.log(`\n☀️  [${ts()}] [오후 1시] 발행 시작`);
  await processQueue();
}, { timezone: 'Asia/Seoul' });

// ─── 스케줄 4: 발행 — 오후 6시 ─────────────────────────────────────────────
cron.schedule('0 18 * * *', async () => {
  console.log(`\n🌆 [${ts()}] [오후 6시] 발행 시작`);
  await processQueue();
}, { timezone: 'Asia/Seoul' });

// ─── 스케줄 5: 발행 — 저녁 10시 ────────────────────────────────────────────
cron.schedule('0 22 * * *', async () => {
  console.log(`\n🌙 [${ts()}] [저녁 10시] 발행 시작`);
  await processQueue();
}, { timezone: 'Asia/Seoul' });

// ─── 스케줄 6: 예약 발행 처리 — 매 30분 ────────────────────────────────────
cron.schedule('*/30 * * * *', async () => {
  try {
    const now = new Date();
    const scheduled = await prisma.post.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
      take: 5,
    });
    if (scheduled.length === 0) return;
    console.log(`\n⏰ [${ts()}] 예약 발행 처리: ${scheduled.length}개`);
    for (const post of scheduled) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'PUBLISHED', publishedAt: post.scheduledAt },
      });
      console.log(`  ✓ 발행: "${post.title}"`);
    }
  } catch (e) {
    console.error('예약 발행 처리 오류:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ─── 시작 메시지 ─────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════╗');
console.log('║   🤖 SEO 자동 블로그 스케줄러 시작       ║');
console.log('╠══════════════════════════════════════════╣');
console.log('║  📌 월·목 오전 7시  : 키워드 수집        ║');
console.log('║  🌅 매일 오전 9시   : 발행 (posts-queue) ║');
console.log('║  ☀️  매일 오후 1시   : 발행 (posts-queue) ║');
console.log('║  🌆 매일 오후 6시   : 발행 (posts-queue) ║');
console.log('║  🌙 매일 저녁 10시  : 발행 (posts-queue) ║');
console.log('║  ⏰ 매 30분         : 예약 글 발행       ║');
console.log('╚══════════════════════════════════════════╝');
console.log(`\n현재 시각: ${ts()}`);
console.log('Ctrl+C 또는 pm2 stop blog-scheduler 로 종료\n');

// ─── 프로세스 유지 ───────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n스케줄러 종료 중...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`[${ts()}] 예상치 못한 오류:`, err);
  prisma.automationLog.create({
    data: { type: 'ERROR', status: 'FAILED', message: err.message },
  }).catch(() => {});
});
