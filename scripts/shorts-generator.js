/**
 * YouTube Shorts 자동 생성 스크립트 v10 — "N가지 리스트" 포맷
 * 참고: "간이 살려달라고 보내는 신호 5가지" (조회수 320만)
 *
 * 구조:
 *   [1] 인트로  (3초)     — 제목 + 빨간 긴급 배지 + 골드 배경 대형 텍스트
 *   [2] 리스트 ×5 (4초)  — 번호 배지 + 핵심 키워드 + pill 자막
 *   [3] 아웃트로(3초)    — 저장·구독 유도
 * 총 재생시간: ~26초
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const OpenAI    = require('openai');
const { PrismaClient } = require('@prisma/client');
const ffmpeg = require('fluent-ffmpeg');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const args   = process.argv.slice(2);
const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
};

const W    = 1080;
const H    = 1920;
const FONT = `'Noto Sans CJK KR','Apple SD Gothic Neo','맑은 고딕','Malgun Gothic',sans-serif`;

// ─── BGM 트랙 목록 ────────────────────────────────────────────────────────────
const BGM_TRACKS = [
  'https://assets.mixkit.co/music/preview/mixkit-gym-hard-workout-600.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-837.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-summer-fun-13.mp3',
];

// ─── 슬라이드 시간 ────────────────────────────────────────────────────────────
const SLIDE_DURATIONS = {
  intro:  3,   // 인트로 제목 카드
  item:   4,   // 리스트 항목 1개
  outro:  3,   // 마무리
};
// 총 재생시간: 3 + (4×5) + 3 = 26초

// ─── 주제별 이미지 쿼리 (밝고 역동적) ──────────────────────────────────────
const TOPIC_CONFIG = {
  weightloss:   { queries: ['fit woman workout gym bright smiling', 'athletic woman fitness motivation bright sunny', 'woman diet healthy lifestyle bright studio'] },
  strength:     { queries: ['fit woman lifting weights gym bright', 'athletic woman strength training bright studio', 'woman gym workout barbell bright cheerful'] },
  cardio:       { queries: ['fit woman running outdoor bright sunshine', 'athletic woman jogging park bright morning', 'woman cycling fitness bright daylight'] },
  nutrition:    { queries: ['healthy food colorful bright meal', 'fresh salad protein bowl bright natural', 'woman healthy eating bright kitchen'] },
  hometraining: { queries: ['fit woman home workout bright room', 'woman yoga mat exercise bright natural light', 'athletic woman bodyweight exercise bright indoor'] },
  motivation:   { queries: ['fit woman confident smiling gym bright', 'athletic woman fitness success happy bright', 'woman sports fashion cheerful bright studio'] },
};

const TOPIC_WORDS = {
  weightloss:   ['체중감량', '살빼기', '지방연소', '다이어트', '감량', '체지방'],
  strength:     ['근력운동', '헬스', '웨이트', '근육', '스쿼트', '데드리프트'],
  cardio:       ['유산소', '러닝', '달리기', '조깅', '자전거', '수영'],
  nutrition:    ['식단', '영양', '단백질', '칼로리', '탄수화물', '식이'],
  hometraining: ['홈트', '홈트레이닝', '맨몸운동', '플랭크', '버피'],
  motivation:   ['바디프로필', '운동동기', '습관', '루틴', '몸만들기'],
};

function detectTopic(post) {
  const text = `${post.title} ${post.excerpt || ''}`;
  for (const [id, words] of Object.entries(TOPIC_WORDS)) {
    if (words.some((w) => text.includes(w))) return id;
  }
  return 'weightloss';
}

// ─── 1. GPT 스크립트 생성 ─────────────────────────────────────────────────────
async function generateShortsScript(post) {
  const topicId = detectTopic(post);
  const config  = TOPIC_CONFIG[topicId] || TOPIC_CONFIG.weightloss;
  const imgQ    = config.queries[Math.floor(Math.random() * config.queries.length)];

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.88,
    max_tokens: 1600,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `당신은 유튜브 쇼츠 "N가지 리스트" 포맷 전문 크리에이터입니다.
"간이 살려달라고 보내는 신호 5가지" 스타일로 320만 조회수를 목표로 합니다.

⚡ 핵심 원칙:
① 제목: "~하면 절대 안 되는 N가지", "살 안 빠지는 이유 N가지", "~의 신호 N가지" 형식
② 각 항목: 키워드(5자 이내) + 설명(25자 이내 한 문장, 구체적 수치 포함)
③ 시청자가 "나도 이러는데!" 공감하거나 "몰랐는데!" 놀라게 하는 내용
④ 긍정적·실용적 톤. 공포 과장 금지. 개인차 인정.
⑤ 30~50대 생활 밀착형 내용`,
      },
      {
        role: 'user',
        content: `블로그 제목: ${post.title}
블로그 요약: ${post.excerpt || ''}

이 주제로 쇼츠 스크립트를 만들어주세요.

아래 JSON으로만 응답:
{
  "youtubeTitle": "제목 (35자 이내, '5가지'·'3가지' 등 숫자 포함) #Shorts",
  "description": "영상 설명 60자 이내",
  "tags": ["다이어트", "운동", "피트니스", "관련태그1", "관련태그2"],
  "badgeText": "지금 바로 확인! (10자 이내)",
  "introTitle": "인트로 제목 (20자 이내, 강렬하게)",
  "introSub": "끝까지 보면 살 빠집니다 👀 (20자 이내)",
  "bgKeyword": "배경 대형 텍스트 키워드 (5자 이내, 주제 핵심어)",
  "items": [
    { "number": 1, "keyword": "키워드 (5자 이내)", "caption": "설명 한 문장 (25자 이내, 수치 포함)" },
    { "number": 2, "keyword": "키워드", "caption": "설명" },
    { "number": 3, "keyword": "키워드", "caption": "설명" },
    { "number": 4, "keyword": "키워드", "caption": "설명" },
    { "number": 5, "keyword": "키워드", "caption": "설명" }
  ],
  "imageQuery": "${imgQ}"
}`,
      },
    ],
  });
  return JSON.parse(res.choices[0].message.content);
}

// ─── 2. Unsplash 이미지 다운로드 ─────────────────────────────────────────────
async function downloadImage(query, outPath) {
  const key  = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY 없음');
  const urls = [
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15`,
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10`,
  ];
  for (const url of urls) {
    try {
      const res    = await axios.get(url, { headers: { Authorization: `Client-ID ${key}` } });
      const photos = res.data.results || [];
      if (!photos.length) continue;
      const photo  = photos[Math.floor(Math.random() * Math.min(8, photos.length))];
      const imgUrl = photo.urls.regular || photo.urls.full;
      const writer = fs.createWriteStream(outPath);
      const dl     = await axios({ url: imgUrl, method: 'GET', responseType: 'stream' });
      dl.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      return;
    } catch { /* try next */ }
  }
  throw new Error(`이미지 없음: "${query}"`);
}

// ─── 3. BGM 다운로드 (실패 시 ffmpeg 합성 폴백) ──────────────────────────────
async function downloadBGM(outPath) {
  const shuffled = [...BGM_TRACKS].sort(() => Math.random() - 0.5);
  for (const url of shuffled) {
    try {
      console.log(`  🎵 BGM 시도: ${url.split('/').pop()}`);
      const res = await axios({ url, method: 'GET', responseType: 'stream', timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; shorts-bot/1.0)', 'Accept': 'audio/mpeg,audio/*' } });
      if (res.status !== 200) continue;
      const writer = fs.createWriteStream(outPath);
      res.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      const sz = fs.statSync(outPath).size;
      if (sz > 30000) { console.log(`  ✅ BGM 완료 (${(sz/1024).toFixed(0)}KB)`); return true; }
    } catch (e) { console.log(`  ⚠️  BGM 실패: ${e.message}`); }
  }
  // 폴백: ffmpeg 합성
  console.log('  🔊 BGM 합성 폴백...');
  try {
    await new Promise((resolve, reject) => {
      const expr = '0.18*sin(2*PI*110*t)+0.10*sin(2*PI*220*t)*sin(2*PI*1.5*t)+0.06*sin(2*PI*440*t)*sin(2*PI*3*t)';
      ffmpeg().input(`aevalsrc=${expr}:s=44100:c=stereo`).inputOptions(['-f', 'lavfi'])
        .outputOptions(['-t', '120', '-c:a', 'aac', '-b:a', '128k', '-af', 'volume=0.55'])
        .output(outPath).on('end', resolve).on('error', reject).run();
    });
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) { console.log('  ✅ BGM 합성 완료'); return true; }
  } catch (e) { console.log(`  ⚠️  BGM 합성 실패: ${e.message}`); }
  console.log('  ⚠️  BGM 완전 실패 — 무음 진행'); return false;
}

// ─── 4-A. 인트로 슬라이드 ────────────────────────────────────────────────────
function makeIntroHtml(script) {
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const bg  = esc(script.bgKeyword || '다이어트');

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:${FONT}; }

/* 상하 그라디언트 */
.top-fade    { position:absolute; top:0; left:0; right:0; height:500px;
  background:linear-gradient(to bottom, rgba(0,0,0,0.70) 0%, transparent 100%); }
.bottom-fade { position:absolute; bottom:0; left:0; right:0; height:900px;
  background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, transparent 100%); }

/* 배경 골드 대형 텍스트 */
.bg-text {
  position:absolute;
  top:50%; left:50%; transform:translate(-50%,-50%) rotate(-15deg);
  font-size:380px; font-weight:900;
  color:rgba(255,210,0,0.13);
  white-space:nowrap; pointer-events:none;
  line-height:1;
}

/* 빨간 긴급 배지 */
.badge {
  position:absolute; top:60px; left:50%; transform:translateX(-50%);
  background:linear-gradient(135deg,#E53935,#FF5252);
  border-radius:60px; padding:22px 72px;
  font-size:44px; font-weight:900; color:#fff;
  white-space:nowrap; letter-spacing:2px;
  box-shadow:0 8px 32px rgba(229,57,53,0.65);
}

/* 메인 타이틀 */
.title-area {
  position:absolute;
  top:50%; left:50%; transform:translate(-50%, -42%);
  width:980px; text-align:center;
}
.title-text {
  font-size:96px; font-weight:900; color:#fff; line-height:1.22;
  word-break:keep-all;
  text-shadow:
    -5px -5px 0 rgba(0,0,0,0.7), 5px -5px 0 rgba(0,0,0,0.7),
    -5px  5px 0 rgba(0,0,0,0.7), 5px  5px 0 rgba(0,0,0,0.7),
    0 6px 28px rgba(0,0,0,0.95);
}
.title-em { color:#FFE066; }

/* 서브 텍스트 */
.sub-text {
  position:absolute;
  bottom:290px; left:50%; transform:translateX(-50%);
  font-size:50px; font-weight:700;
  color:rgba(255,255,255,0.80);
  white-space:nowrap;
  text-shadow:0 3px 12px rgba(0,0,0,0.90);
}

/* 브랜드 */
.brand {
  position:absolute; bottom:210px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:12px;
  background:rgba(0,0,0,0.38); backdrop-filter:blur(8px);
  border-radius:50px; padding:14px 36px;
}
.brand-icon { font-size:32px; }
.brand-name  { font-size:28px; font-weight:800; color:#fff; }

/* 진행 점 */
.dots { position:absolute; bottom:140px; left:50%; transform:translateX(-50%);
        display:flex; gap:14px; }
.dot  { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,0.30); }
.dot.active { width:40px; border-radius:7px; background:#E53935; }
</style>
</head><body>
<div class="top-fade"></div>
<div class="bottom-fade"></div>
<div class="bg-text">${bg}</div>

<div class="badge">⚠️ ${esc(script.badgeText || '지금 바로 확인!')}</div>

<div class="title-area">
  <div class="title-text">${esc(script.introTitle || script.youtubeTitle.replace(/#Shorts/gi,'').trim())}</div>
</div>

<div class="sub-text">${esc(script.introSub || '끝까지 보세요 👀')}</div>

<div class="brand">
  <span class="brand-icon">💪</span>
  <span class="brand-name">다이어트·운동 백과</span>
</div>

<div class="dots">
  <div class="dot active"></div>
  <div class="dot"></div><div class="dot"></div><div class="dot"></div>
  <div class="dot"></div><div class="dot"></div><div class="dot"></div>
</div>
</body></html>`;
}

// ─── 4-B. 리스트 항목 슬라이드 ──────────────────────────────────────────────
function makeListItemHtml(item, idx, total, bgKeyword) {
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // 번호별 색상
  const numColors = [
    { bg:'#3B82F6', glow:'rgba(59,130,246,0.70)' },   // 1 — 파랑
    { bg:'#22C55E', glow:'rgba(34,197,94,0.70)'  },   // 2 — 초록
    { bg:'#F97316', glow:'rgba(249,115,22,0.70)' },   // 3 — 오렌지
    { bg:'#A855F7', glow:'rgba(168,85,247,0.70)' },   // 4 — 보라
    { bg:'#EF4444', glow:'rgba(239,68,68,0.70)'  },   // 5 — 빨강
  ];
  const nc  = numColors[(item.number - 1) % numColors.length];
  const bg  = esc(bgKeyword || item.keyword || '');
  const dotActive = nc.bg;

  // 7개 점 (인트로1 + 항목5 + 아웃트로1), 현재 인덱스 = idx+1
  const dots = Array.from({ length: total + 2 }, (_, i) =>
    `<div class="dot${i === idx + 1 ? ' active' : ''}"></div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:${FONT}; }

.top-fade    { position:absolute; top:0; left:0; right:0; height:420px;
  background:linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%); }
.bottom-fade { position:absolute; bottom:0; left:0; right:0; height:800px;
  background:linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.52) 45%, transparent 100%); }

/* 배경 골드 대형 텍스트 */
.bg-text {
  position:absolute;
  top:50%; left:50%; transform:translate(-50%,-50%) rotate(-12deg);
  font-size:320px; font-weight:900;
  color:rgba(255,210,0,0.11);
  white-space:nowrap; pointer-events:none; line-height:1;
}

/* 번호 배지 */
.num-badge {
  position:absolute; top:52px; left:56px;
  width:160px; height:160px; border-radius:50%;
  background:${nc.bg};
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 0 0 6px rgba(255,255,255,0.18), 0 8px 32px ${nc.glow};
}
.num-text {
  font-size:96px; font-weight:900; color:#fff; line-height:1;
  text-shadow:0 3px 12px rgba(0,0,0,0.50);
}

/* 브랜드 (상단 우측) */
.brand {
  position:absolute; top:62px; right:52px;
  display:flex; align-items:center; gap:10px;
  background:rgba(0,0,0,0.36); backdrop-filter:blur(8px);
  border-radius:50px; padding:12px 28px;
}
.brand-icon { font-size:26px; }
.brand-name  { font-size:24px; font-weight:800; color:#fff; }

/* 핵심 키워드 (중앙) */
.keyword-area {
  position:absolute;
  top:50%; left:50%; transform:translate(-50%, -58%);
  width:1000px; text-align:center;
}
.keyword-text {
  font-size:148px; font-weight:900; color:#FFE066; line-height:1.15;
  word-break:keep-all;
  text-shadow:
    -6px -6px 0 rgba(0,0,0,0.65), 6px -6px 0 rgba(0,0,0,0.65),
    -6px  6px 0 rgba(0,0,0,0.65), 6px  6px 0 rgba(0,0,0,0.65),
    0 0 60px rgba(255,200,0,0.40), 0 6px 28px rgba(0,0,0,0.95);
  letter-spacing:-4px;
}

/* Pill 자막 (하단) */
.caption-wrap {
  position:absolute;
  bottom:310px; left:0; right:0;
  padding:0 68px; text-align:center;
}
.caption-pill {
  display:inline-block;
  background:rgba(0,0,0,0.78);
  border-radius:24px; padding:22px 44px;
  font-size:56px; font-weight:800; color:#fff; line-height:1.50;
  word-break:keep-all;
  text-shadow:0 2px 10px rgba(0,0,0,0.95);
  backdrop-filter:blur(8px);
  border:1.5px solid rgba(255,255,255,0.12);
}

/* 진행 점 */
.dots { position:absolute; bottom:230px; left:50%; transform:translateX(-50%);
        display:flex; gap:12px; align-items:center; }
.dot  { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,0.28); }
.dot.active { width:40px; border-radius:7px; background:${dotActive}; }
</style>
</head><body>
<div class="top-fade"></div>
<div class="bottom-fade"></div>
<div class="bg-text">${bg}</div>

<div class="num-badge"><div class="num-text">${item.number}</div></div>
<div class="brand"><span class="brand-icon">💪</span><span class="brand-name">다이어트·운동 백과</span></div>

<div class="keyword-area">
  <div class="keyword-text">${esc(item.keyword)}</div>
</div>

<div class="caption-wrap">
  <div class="caption-pill">${esc(item.caption)}</div>
</div>

<div class="dots">${dots}</div>
</body></html>`;
}

// ─── 4-C. 아웃트로 슬라이드 ──────────────────────────────────────────────────
function makeOutroHtml() {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:${FONT}; }

.overlay { position:absolute; inset:0;
  background:linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.28) 100%); }

.content {
  position:absolute;
  top:50%; left:50%; transform:translate(-50%, -50%);
  width:980px; text-align:center;
}
.emoji { font-size:140px; line-height:1; margin-bottom:32px; }
.main-text {
  font-size:80px; font-weight:900; color:#FFE066; line-height:1.30;
  word-break:keep-all;
  text-shadow:0 0 50px rgba(255,200,0,0.35), 0 4px 22px rgba(0,0,0,0.95);
  margin-bottom:14px;
}
.divider {
  width:160px; height:5px; background:rgba(255,255,255,0.32);
  border-radius:3px; margin:26px auto;
}
.action-text {
  font-size:60px; font-weight:800; color:#fff; line-height:1.45;
  word-break:keep-all;
  text-shadow:0 3px 14px rgba(0,0,0,0.95);
}
.save-text {
  margin-top:24px;
  font-size:50px; font-weight:700; color:rgba(255,255,255,0.72);
  word-break:keep-all;
}

.brand {
  position:absolute; bottom:310px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:12px;
  background:rgba(0,0,0,0.42); backdrop-filter:blur(8px);
  border-radius:50px; padding:14px 38px;
}
.brand-icon { font-size:32px; }
.brand-name  { font-size:30px; font-weight:800; color:#fff; }

.dots { position:absolute; bottom:235px; left:50%; transform:translateX(-50%);
        display:flex; gap:12px; align-items:center; }
.dot  { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,0.28); }
.dot.active { width:40px; border-radius:7px; background:#E53935; }
</style>
</head><body>
<div class="overlay"></div>
<div class="content">
  <div class="emoji">💾</div>
  <div class="main-text">도움이 됐다면<br>저장하세요!</div>
  <div class="divider"></div>
  <div class="action-text">댓글로 알려주세요 💬</div>
  <div class="save-text">매일 새 정보 받으려면<br>구독 + 알림 설정 💪</div>
</div>
<div class="brand">
  <span class="brand-icon">💪</span>
  <span class="brand-name">다이어트·운동 백과</span>
</div>
<div class="dots">
  <div class="dot"></div><div class="dot"></div><div class="dot"></div>
  <div class="dot"></div><div class="dot"></div><div class="dot"></div>
  <div class="dot active"></div>
</div>
</body></html>`;
}

// ─── 5. 슬라이드 클립 합성 ───────────────────────────────────────────────────
function createSlideClip(imagePath, overlayPath, duration, outPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const d      = duration.toFixed(2);
    const noFade = opts.noFade || false;
    const vf     = noFade
      ? `[bg][1:v]overlay=0:0:eof_action=repeat[out]`
      : `[bg][1:v]overlay=0:0:eof_action=repeat,fade=t=in:st=0:d=0.30,fade=t=out:st=${(parseFloat(d) - 0.40).toFixed(2)}:d=0.40[out]`;
    ffmpeg()
      .input(imagePath).inputOptions(['-loop', '1', '-framerate', '25'])
      .input(overlayPath)
      .input('anullsrc=r=44100:cl=stereo').inputOptions(['-f', 'lavfi'])
      .complexFilter([
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg]`,
        vf,
      ])
      .outputOptions([
        '-map', '[out]', '-map', '2:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k',
        '-pix_fmt', 'yuv420p', '-t', d, '-movflags', '+faststart',
      ])
      .output(outPath)
      .on('end', resolve).on('error', reject).run();
  });
}

// ─── 6. 클립 이어붙이기 ──────────────────────────────────────────────────────
function concatClips(clipPaths, outPath) {
  return new Promise((resolve, reject) => {
    const listFile = outPath.replace('.mp4', '_list.txt');
    fs.writeFileSync(listFile, clipPaths.map((p) => `file '${p}'`).join('\n'));
    ffmpeg()
      .input(listFile).inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      ])
      .output(outPath)
      .on('progress', (p) => process.stdout.write(`\r  합성 중: ${Math.round(p.percent || 0)}%`))
      .on('end', () => { console.log(''); fs.unlinkSync(listFile); resolve(); })
      .on('error', reject).run();
  });
}

// ─── 7. BGM 삽입 ─────────────────────────────────────────────────────────────
function addBGMToVideo(videoPath, bgmPath, outPath, totalDuration) {
  const fadeOutSt = Math.max(1, (totalDuration || 26) - 2.5).toFixed(2);
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(bgmPath).inputOptions(['-stream_loop', '-1'])
      .outputOptions([
        '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
        '-af', `volume=0.28,afade=t=in:st=0:d=1.0,afade=t=out:st=${fadeOutSt}:d=2.0`,
        '-shortest', '-movflags', '+faststart',
      ])
      .output(outPath)
      .on('end', resolve).on('error', reject).run();
  });
}

// ─── 8. 썸네일 합성 ──────────────────────────────────────────────────────────
function compositeThumbnail(bgPath, overlayPath, outPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(bgPath).input(overlayPath)
      .complexFilter([
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg]`,
        `[bg][1:v]overlay=0:0[out]`,
      ])
      .map('[out]')
      .outputOptions(['-frames:v', '1', '-q:v', '2'])
      .output(outPath)
      .on('end', resolve).on('error', reject).run();
  });
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== 다이어트·운동 쇼츠 v10 — N가지 리스트 포맷 ===\n');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shorts-'));
  const outDir = path.join(process.cwd(), 'shorts-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    // ── 대상 글 조회 ─────────────────────────────────────────────────────────
    const postId = getArg('post-id');
    const post   = postId
      ? await prisma.post.findUnique({ where: { id: parseInt(postId) }, include: { category: true } })
      : await prisma.post.findFirst({
          where: { status: 'PUBLISHED', shortsGenerated: false },
          orderBy: { publishedAt: 'desc' },
          include: { category: true },
        });
    if (!post) { console.log('쇼츠를 만들 글이 없습니다.'); return; }
    console.log(`대상 글: "${post.title}"\n`);

    // ── 1단계: GPT 스크립트 ─────────────────────────────────────────────────
    console.log('[1/4] 스크립트 생성...');
    const script = await generateShortsScript(post);
    const items  = (script.items || []).slice(0, 5);
    console.log(`  제목: ${script.youtubeTitle}`);
    console.log(`  인트로: ${script.introTitle}`);
    items.forEach((it) => console.log(`    ${it.number}. [${it.keyword}] ${it.caption}`));

    // ── 2단계: BGM ───────────────────────────────────────────────────────────
    console.log('\n[2/4] BGM 다운로드...');
    const bgmPath  = path.join(tmpDir, 'bgm.mp3');
    const bgmReady = await downloadBGM(bgmPath);

    // ── 3단계: 클립 생성 ─────────────────────────────────────────────────────
    console.log('\n[3/4] 클립 생성...\n');
    const clipPaths = [];

    // 헬퍼: Puppeteer 렌더링
    async function renderOverlay(html, outPath) {
      const pg = await browser.newPage();
      await pg.setViewport({ width: W, height: H });
      await pg.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 380));
      await pg.screenshot({ path: outPath, omitBackground: true });
      await pg.close();
    }

    // 이미지 다운로드 헬퍼
    async function getImage(queries, outPath) {
      for (const q of queries) {
        try { await downloadImage(q, outPath); return true; } catch { /* try next */ }
      }
      return false;
    }

    // ── 인트로 이미지 (밝고 역동적인 피트니스)
    const introImgPath = path.join(tmpDir, 'img_intro.jpg');
    const introImgOk   = await getImage([
      script.imageQuery || 'fit woman fitness gym bright smiling',
      'athletic woman workout bright studio',
      'fit woman exercise bright sunny',
    ], introImgPath);
    if (!introImgOk) { console.log('❌ 인트로 이미지 실패'); return; }

    // [1] 인트로 (3초)
    console.log('  ── [1] INTRO 3초 ──');
    {
      const ovPath   = path.join(tmpDir, 'ov_intro.png');
      const clipPath = path.join(tmpDir, 'clip_intro.mp4');
      await renderOverlay(makeIntroHtml(script), ovPath);
      process.stdout.write('     🎬 intro...');
      await createSlideClip(introImgPath, ovPath, SLIDE_DURATIONS.intro, clipPath);
      console.log(' ✅'); clipPaths.push(clipPath);
    }

    // [2] 리스트 항목 (항목당 4초, 이미지 개별 다운로드)
    for (let i = 0; i < items.length; i++) {
      const item     = items[i];
      const imgPath  = path.join(tmpDir, `img_item${i}.jpg`);
      const topicId  = detectTopic(post);
      const cfg      = TOPIC_CONFIG[topicId] || TOPIC_CONFIG.weightloss;
      const q        = cfg.queries[i % cfg.queries.length];

      console.log(`  ── [${i + 2}] ITEM ${item.number} — "${item.keyword}" ──`);
      const ok = await getImage([q, 'fit woman fitness workout bright', 'athletic woman exercise bright'], imgPath);
      if (!ok) { console.log('     ⚠️  이미지 실패, 인트로 이미지 재사용'); fs.copyFileSync(introImgPath, imgPath); }

      const ovPath   = path.join(tmpDir, `ov_item${i}.png`);
      const clipPath = path.join(tmpDir, `clip_item${i}.mp4`);
      await renderOverlay(makeListItemHtml(item, i, items.length, script.bgKeyword), ovPath);
      process.stdout.write(`     🎬 item ${item.number}...`);
      await createSlideClip(imgPath, ovPath, SLIDE_DURATIONS.item, clipPath);
      console.log(' ✅'); clipPaths.push(clipPath);
    }

    // [3] 아웃트로 (3초)
    console.log('  ── [마지막] OUTRO 3초 ──');
    {
      const outroImgPath = path.join(tmpDir, 'img_outro.jpg');
      const outroOk = await getImage([
        'fit woman celebrating workout success happy bright',
        'athletic woman smiling confident gym bright',
      ], outroImgPath);

      const ovPath   = path.join(tmpDir, 'ov_outro.png');
      const clipPath = path.join(tmpDir, 'clip_outro.mp4');
      await renderOverlay(makeOutroHtml(), ovPath);
      process.stdout.write('     🎬 outro...');
      await createSlideClip(outroOk ? outroImgPath : introImgPath, ovPath, SLIDE_DURATIONS.outro, clipPath);
      console.log(' ✅'); clipPaths.push(clipPath);
    }

    if (clipPaths.length === 0) { console.log('클립 생성 실패'); return; }

    // ── 4단계: 최종 합성 + BGM ──────────────────────────────────────────────
    console.log('\n[4/4] 최종 합성...');
    const rawPath      = path.join(tmpDir, 'raw.mp4');
    await concatClips(clipPaths, rawPath);

    // 총 재생시간: intro(3) + items(4×5) + outro(3) = 26초
    const totalDuration = SLIDE_DURATIONS.intro + (items.length * SLIDE_DURATIONS.item) + SLIDE_DURATIONS.outro;

    let finalPath = rawPath;
    if (bgmReady && fs.existsSync(bgmPath)) {
      finalPath = path.join(tmpDir, 'final.mp4');
      process.stdout.write('  🎵 BGM 삽입...');
      await addBGMToVideo(rawPath, bgmPath, finalPath, totalDuration);
      console.log(' ✅');
    }
    const sizeMB = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
    console.log(`  완성: ${sizeMB}MB\n`);

    // ── 썸네일: 영상 0.8초 프레임 추출 (항상 인트로 화면 = 퀴즈 노출 없음) ──
    const thumbJpgPath = path.join(tmpDir, 'thumb.jpg');
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(finalPath)
          .inputOptions(['-ss', '0.8'])
          .outputOptions(['-frames:v', '1', '-q:v', '2', '-vf', `scale=${W}:${H}`])
          .output(thumbJpgPath)
          .on('end', resolve).on('error', reject).run();
      });
      console.log('  📸 썸네일 추출 완료 (0.8초 = 인트로 화면)\n');
    } catch (e) {
      // 폴백: intro 오버레이 + 이미지 합성
      try {
        const introOv = path.join(tmpDir, 'ov_intro.png');
        if (fs.existsSync(introOv)) await compositeThumbnail(introImgPath, introOv, thumbJpgPath);
        console.log('  📸 썸네일 합성 완료 (폴백)\n');
      } catch (e2) { console.log(`  ⚠️  썸네일 실패: ${e2.message}\n`); }
    }

    // ── 로컬 저장 ────────────────────────────────────────────────────────────
    const savePath = path.join(outDir, `${post.slug}.mp4`);
    fs.copyFileSync(finalPath, savePath);
    if (fs.existsSync(thumbJpgPath)) {
      fs.copyFileSync(thumbJpgPath, path.join(outDir, `${post.slug}-thumb.jpg`));
    }
    console.log(`💾 영상 저장: ${savePath}`);

    // ── YouTube 업로드 ────────────────────────────────────────────────────────
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://smartinfohealth.co.kr';
    const postUrl  = `${siteUrl}/${post.category.slug}/${post.slug}`;
    const fullDesc =
      `📖 전체 내용 블로그에서 확인하세요 👇\n${postUrl}\n\n` +
      `${script.description || ''}\n\n` +
      `이 영상이 도움이 됐다면 구독 & 좋아요! 💪\n` +
      `매일 새로운 다이어트·운동 꿀팁을 쇼츠로 전해드립니다.\n\n` +
      `─────────────────────\n` +
      `${(script.tags || []).map((t) => '#' + t.replace(/\s/g, '')).join(' ')} #Shorts #다이어트 #운동 #피트니스`;

    if (process.env.YOUTUBE_REFRESH_TOKEN) {
      const { uploadToYouTube, uploadThumbnail, postComment } = require('./youtube-uploader');
      console.log('\n  업로드 진행...');
      const videoId = await uploadToYouTube({
        videoPath: finalPath,
        title:     script.youtubeTitle,
        description: fullDesc,
        tags:      [...(script.tags || []), '다이어트', '운동', '피트니스', '쇼츠', 'Shorts'],
        categoryId: '26',
      });

      if (fs.existsSync(thumbJpgPath)) {
        try { await uploadThumbnail({ videoId, thumbnailPath: thumbJpgPath }); console.log('  ✅ 썸네일 업로드'); }
        catch (e) { console.log(`  ⚠️  썸네일 실패: ${e.message}`); }
      }

      try {
        await postComment({ videoId, text: `📖 더 자세한 내용은 블로그에서 👇\n${postUrl}` });
        console.log('  ✅ 블로그 링크 댓글');
      } catch { /* 댓글 스코프 없으면 스킵 */ }

      await prisma.post.update({ where: { id: post.id }, data: { shortsGenerated: true, shortsVideoId: videoId } });
      console.log(`\n✅ 업로드 완료! https://youtube.com/shorts/${videoId}`);
    } else {
      await prisma.post.update({ where: { id: post.id }, data: { shortsGenerated: true } });
      console.log('\n✅ 로컬 저장 완료 (YOUTUBE_REFRESH_TOKEN 없음)');
    }

  } catch (e) {
    console.error('\n오류:', e.message);
    if (process.env.DEBUG) console.error(e.stack);
  } finally {
    await browser.close().catch(() => {});
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

main().catch(console.error);
