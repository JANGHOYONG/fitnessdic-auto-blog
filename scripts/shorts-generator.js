/**
 * YouTube Shorts 자동 생성 스크립트 v9 — 퀴즈 포맷
 * 포맷: "이거 알면 천재" 퀴즈 형식
 * 구조:
 *   [1] quiz (8초)      — 퀴즈 문제 + A/B/C/D 선택지
 *   [2] countdown (5초) — 5→4→3→2→1 카운트다운 (각 1초)
 *   [3] answer (12초)   — 정답 공개 + 이유 설명
 *   [4] outro (6초)     — 마무리 멘트 + 저장 유도
 * 총 재생시간: ~31초
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

const args = process.argv.slice(2);
const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
};

const W = 1080;
const H = 1920;
const FONT = `'Noto Sans CJK KR','Apple SD Gothic Neo','맑은 고딕','Malgun Gothic',sans-serif`;

// ─── BGM 트랙 목록 (로열티 프리 — Mixkit CDN) ────────────────────────────────
const BGM_TRACKS = [
  'https://assets.mixkit.co/music/preview/mixkit-gym-hard-workout-600.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-837.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-hip-hop-03-738.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-summer-fun-13.mp3',
];

// ─── 슬라이드 유형별 표시 시간(초) ──────────────────────────────────────────
const SLIDE_DURATIONS = {
  quiz:      8,   // 퀴즈 문제 + 선택지
  countdown: 1,   // 카운트다운 숫자 (5개 × 1초 = 5초)
  answer:    12,  // 정답 공개 + 설명
  outro:     6,   // 마무리 멘트
};

// ─── 주제별 설정 ──────────────────────────────────────────────────────────────
const TOPIC_CONFIG = {
  weightloss: {
    imageQueries: [
      'fit woman workout gym smiling athletic',
      'woman fitness body motivation healthy lifestyle',
      'athletic woman running outdoor sporty',
      'fit woman yoga exercise beautiful',
    ],
    dataType: 'nutrition',
  },
  strength: {
    imageQueries: [
      'fit woman lifting weights gym confident',
      'athletic woman strength training barbell',
      'woman fitness gym workout beautiful',
      'fit woman squat deadlift exercise',
    ],
    dataType: 'workout',
  },
  cardio: {
    imageQueries: [
      'fit woman running park outdoors happy',
      'athletic woman cardio jogging sunrise',
      'woman fitness running shoes outdoor',
      'fit woman cycling spinning class',
    ],
    dataType: 'workout',
  },
  nutrition: {
    imageQueries: [
      'healthy food meal prep colorful diet',
      'fresh salad protein bowl healthy eating',
      'woman healthy meal prep kitchen',
      'colorful healthy food vegetables fruit',
    ],
    dataType: 'nutrition',
  },
  hometraining: {
    imageQueries: [
      'fit woman home workout yoga mat',
      'athletic woman bodyweight exercise indoors',
      'woman fitness training living room',
      'fit woman stretching exercise beautiful',
    ],
    dataType: 'workout',
  },
  motivation: {
    imageQueries: [
      'fit woman confident body positive gym',
      'athletic woman fitness motivation beautiful',
      'woman sports fashion gym trendy',
      'fit woman happiness workout outdoor',
    ],
    dataType: 'motivation',
  },
};

// ─── 주제 감지 키워드 ─────────────────────────────────────────────────────────
const TOPIC_WORDS = {
  weightloss:   ['체중감량', '살빼기', '지방연소', '다이어트', '감량', '체지방'],
  strength:     ['근력운동', '헬스', '웨이트', '근육', '스쿼트', '데드리프트', '벤치프레스'],
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

// ─── 1. GPT 스크립트 생성 (퀴즈 포맷) ───────────────────────────────────────
async function generateShortsScript(post) {
  const topicId = detectTopic(post);
  const config  = TOPIC_CONFIG[topicId] || TOPIC_CONFIG.weightloss;
  const imgQ    = config.imageQueries[Math.floor(Math.random() * config.imageQueries.length)];

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.85,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `당신은 다이어트·운동 지식 퀴즈 쇼츠 전문 크리에이터입니다.
"이거 알면 천재" 스타일로 시청자가 끝까지 보게 만드는 퀴즈 콘텐츠를 만듭니다.

⚡ 퀴즈 원칙:
① 정답이 의외이거나 많은 사람이 틀리는 내용 (진짜 유용한 지식)
② A/B/C/D 4지선다 — 각 선택지가 헷갈려야 흥미로움
③ 정답 설명은 구체적 수치나 과학적 근거 포함 (예: 30g, 48시간, 운동 후 30분)
④ 긍정적이고 유익한 내용. 공포·혐오 표현 절대 금지
⑤ 30~50대도 공감할 수 있는 생활 밀착형 내용`,
      },
      {
        role: 'user',
        content: `블로그 제목: ${post.title}
블로그 요약: ${post.excerpt || ''}

이 주제로 "이거 알면 천재" 스타일의 퀴즈 쇼츠 스크립트를 만들어주세요.

아래 JSON으로만 응답 (다른 텍스트 없이):
{
  "youtubeTitle": "이거 알면 천재? [퀴즈] 핵심키워드 #Shorts (35자 이내)",
  "description": "퀴즈 내용을 담은 영상 설명 60자 이내",
  "tags": ["다이어트퀴즈", "운동상식", "피트니스", "관련태그1", "관련태그2"],
  "quiz": {
    "question": "퀴즈 질문 (25자 이내, 임팩트 있게)",
    "subQuestion": "보기를 골라보세요! 🤔",
    "choices": [
      "A. 선택지 내용",
      "B. 선택지 내용",
      "C. 선택지 내용",
      "D. 선택지 내용"
    ],
    "answer": "B",
    "answerText": "정답: B. 선택지 내용",
    "explanation": "정답 이유 설명 (구체적 수치 포함, 2~3문장, 60자 이내)",
    "bonusTip": "추가 꿀팁 한 줄 (20자 이내)",
    "imageQuery": "${imgQ}"
  }
}`,
      },
    ],
  });
  return JSON.parse(res.choices[0].message.content);
}

// ─── 2. Unsplash 이미지 다운로드 ──────────────────────────────────────────────
async function downloadImage(query, outPath) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY 없음');

  const urls = [
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15`,
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10`,
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { headers: { Authorization: `Client-ID ${key}` } });
      const photos = (res.data.results || []);
      if (!photos.length) continue;
      const photo = photos[Math.floor(Math.random() * Math.min(8, photos.length))];
      const imgUrl = photo.urls.regular || photo.urls.full;
      const writer = fs.createWriteStream(outPath);
      const response = await axios({ url: imgUrl, method: 'GET', responseType: 'stream' });
      response.data.pipe(writer);
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
      const res = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; shorts-bot/1.0)',
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        },
      });
      // 응답 상태 코드 체크
      if (res.status !== 200) { console.log(`  ⚠️  HTTP ${res.status} — 다음 시도`); continue; }
      const writer = fs.createWriteStream(outPath);
      res.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      const sz = fs.statSync(outPath).size;
      if (sz > 30000) {           // 30KB 이상이면 유효한 MP3
        console.log(`  ✅ BGM 다운로드 완료 (${(sz/1024).toFixed(0)}KB)`);
        return true;
      }
      console.log(`  ⚠️  파일 너무 작음 (${sz}B) — 다음 시도`);
    } catch (e) {
      console.log(`  ⚠️  BGM 실패: ${e.message}`);
    }
  }
  // ── 폴백: ffmpeg aevalsrc로 간단한 비트 합성 ──
  console.log('  🔊 BGM 합성 폴백 시작 (ffmpeg aevalsrc)...');
  try {
    await new Promise((resolve, reject) => {
      const expr =
        '0.18*sin(2*PI*110*t)+' +
        '0.10*sin(2*PI*220*t)*sin(2*PI*1.5*t)+' +
        '0.06*sin(2*PI*440*t)*sin(2*PI*3*t)';
      ffmpeg()
        .input(`aevalsrc=${expr}:s=44100:c=stereo`)
        .inputOptions(['-f', 'lavfi'])
        .outputOptions([
          '-t', '120',
          '-c:a', 'aac', '-b:a', '128k',
          '-af', 'volume=0.55,highpass=f=60,lowpass=f=8000',
        ])
        .output(outPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      console.log('  ✅ BGM 합성 완료');
      return true;
    }
  } catch (e) {
    console.log(`  ⚠️  BGM 합성 실패: ${e.message}`);
  }
  console.log('  ⚠️  BGM 완전 실패 — 무음으로 진행');
  return false;
}

// ─── 4-A. 퀴즈 슬라이드 오버레이 (countdownNum=null: 첫 등장, 1~5: 카운트다운 모드)
// 카운트다운일 때는 선택지를 그대로 보여주면서 상단에 숫자만 추가
function makeQuizHtml(quiz, countdownNum = null) {
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const choiceColors = [
    { bg:'rgba(59,130,246,0.88)',  border:'#60A5FA' },  // A — 파랑
    { bg:'rgba(34,197,94,0.88)',   border:'#4ADE80' },  // B — 초록
    { bg:'rgba(249,115,22,0.88)',  border:'#FB923C' },  // C — 오렌지
    { bg:'rgba(168,85,247,0.88)',  border:'#C084FC' },  // D — 보라
  ];

  const isCountdown = countdownNum !== null;
  const cdColors = { 5:'#FFE066', 4:'#FFC040', 3:'#FF8C30', 2:'#FF5050', 1:'#FF1A1A' };
  const cdColor  = cdColors[countdownNum] || '#FFE066';
  const cdGlow   = countdownNum <= 2
    ? '0 0 50px rgba(255,60,0,0.80)'
    : '0 0 40px rgba(255,180,0,0.65)';

  // 카운트다운 모드: 상단 배지 대신 원형 숫자 + 타이머 바
  const topArea = isCountdown ? `
<div class="cd-wrap">
  <div class="cd-circle" style="border-color:${cdColor};box-shadow:${cdGlow}">
    <div class="cd-num" style="color:${cdColor};text-shadow:${cdGlow},0 4px 20px rgba(0,0,0,0.95)">${countdownNum}</div>
  </div>
  <div class="cd-label" style="color:${cdColor}">초 후 정답 공개!</div>
</div>` : `
<div class="badge">👑 이거 알면 천재!</div>
<div class="brand"><span class="brand-icon">💪</span><span class="brand-name">다이어트·운동 백과</span></div>`;

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:${FONT}; }

.top-fade    { position:absolute; top:0; left:0; right:0; height:${isCountdown ? '480px' : '320px'};
               background:linear-gradient(to bottom, rgba(0,0,0,0.85), transparent); }
.bottom-fade { position:absolute; bottom:0; left:0; right:0; height:700px;
               background:linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.75) 40%, transparent 100%); }

/* ── 첫 등장 모드: 배지 + 브랜드 ── */
.badge {
  position:absolute; top:50px; left:50%; transform:translateX(-50%);
  background:linear-gradient(135deg,#E8631A,#FF8C42);
  border-radius:60px; padding:20px 70px;
  font-size:46px; font-weight:900; color:#fff;
  white-space:nowrap; letter-spacing:2px;
  box-shadow:0 8px 30px rgba(232,99,26,0.6);
}
.brand {
  position:absolute; top:168px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:10px; opacity:0.75;
}
.brand-icon { font-size:28px; }
.brand-name  { font-size:26px; font-weight:700; color:#fff; }

/* ── 카운트다운 모드: 원형 숫자 ── */
.cd-wrap {
  position:absolute; top:28px; left:50%; transform:translateX(-50%);
  display:flex; flex-direction:column; align-items:center; gap:0;
}
.cd-circle {
  width:220px; height:220px; border-radius:50%;
  border:10px solid; background:rgba(0,0,0,0.60);
  display:flex; align-items:center; justify-content:center;
}
.cd-num {
  font-size:140px; font-weight:900; line-height:1;
}
.cd-label {
  margin-top:14px;
  font-size:40px; font-weight:800;
  text-shadow:0 3px 12px rgba(0,0,0,0.95);
  white-space:nowrap;
}

/* ── 공통: 퀴즈 질문 ── */
.question-area {
  position:absolute;
  top:${isCountdown ? '310px' : '270px'}; left:0; right:0;
  padding:0 70px; text-align:center;
}
.question-text {
  font-size:${isCountdown ? '66px' : '72px'}; font-weight:900; color:#fff; line-height:1.30;
  word-break:keep-all;
  text-shadow:0 4px 20px rgba(0,0,0,0.95),-3px -3px 0 rgba(0,0,0,0.5),3px 3px 0 rgba(0,0,0,0.5);
}
.sub-question {
  margin-top:20px;
  font-size:42px; font-weight:600; color:rgba(255,255,255,0.65);
}

/* ── 공통: 선택지 ── */
.choices {
  position:absolute;
  bottom:${isCountdown ? '255px' : '270px'}; left:0; right:0;
  padding:0 60px;
  display:flex; flex-direction:column; gap:${isCountdown ? '18px' : '22px'};
}
.choice {
  display:flex; align-items:center; gap:24px;
  border-radius:24px; padding:${isCountdown ? '22px 36px' : '26px 36px'};
  border:3px solid; backdrop-filter:blur(12px);
}
.choice-label { font-size:46px; font-weight:900; color:#fff; min-width:52px; }
.choice-text  {
  font-size:${isCountdown ? '42px' : '44px'}; font-weight:700; color:#fff; line-height:1.25;
  word-break:keep-all;
}

/* ── 공통: 진행 점 ── */
.dots { position:absolute; bottom:${isCountdown ? '185px' : '200px'};
        left:50%; transform:translateX(-50%);
        display:flex; gap:14px; align-items:center; }
.dot  { width:16px; height:16px; border-radius:50%; background:rgba(255,255,255,0.30); }
.dot.active { width:44px; border-radius:8px; background:${isCountdown ? cdColor : '#E8631A'}; }
</style>
</head><body>
<div class="top-fade"></div>
<div class="bottom-fade"></div>

${topArea}

<div class="question-area">
  <div class="question-text">${esc(quiz.question)}</div>
  <div class="sub-question">${isCountdown ? '⏳ 몇 번인지 선택해보셨나요?' : esc(quiz.subQuestion || '보기를 골라보세요! 🤔')}</div>
</div>

<div class="choices">
  ${(quiz.choices || []).map((c, i) => `
  <div class="choice" style="background:${choiceColors[i]?.bg || 'rgba(0,0,0,0.6)'};border-color:${choiceColors[i]?.border || '#fff'}">
    <span class="choice-label">${['A','B','C','D'][i]}</span>
    <span class="choice-text">${esc(c.replace(/^[A-D]\.\s*/,''))}</span>
  </div>`).join('')}
</div>

<div class="dots">
  <div class="dot active"></div>
  <div class="dot"></div><div class="dot"></div><div class="dot"></div>
</div>
</body></html>`;
}

// ─── 4-C. 정답 슬라이드 오버레이 ────────────────────────────────────────────
function makeAnswerHtml(quiz) {
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:${FONT}; }

.top-fade    { position:absolute; top:0; left:0; right:0; height:350px;
               background:linear-gradient(to bottom, rgba(0,0,0,0.80), transparent); }
.bottom-fade { position:absolute; bottom:0; left:0; right:0; height:900px;
               background:linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 35%, transparent 100%); }

/* 상단 배지 */
.badge {
  position:absolute; top:50px; left:50%; transform:translateX(-50%);
  background:linear-gradient(135deg,#11998e,#38ef7d);
  border-radius:60px; padding:20px 70px;
  font-size:46px; font-weight:900; color:#fff;
  white-space:nowrap; letter-spacing:2px;
  box-shadow:0 8px 30px rgba(17,153,142,0.6);
}

/* 정답 텍스트 */
.answer-area {
  position:absolute;
  top:230px; left:0; right:0;
  padding:0 70px; text-align:center;
}
.answer-label { font-size:48px; font-weight:700; color:rgba(255,255,255,0.70); margin-bottom:18px; }
.answer-text  {
  font-size:84px; font-weight:900; color:#FFE066; line-height:1.25;
  word-break:keep-all;
  text-shadow:0 0 60px rgba(255,220,0,0.5), 0 5px 20px rgba(0,0,0,0.95);
}

/* 설명 카드 */
.explanation-card {
  position:absolute;
  bottom:350px; left:60px; right:60px;
  background:rgba(8,8,8,0.90);
  backdrop-filter:blur(16px);
  border-radius:32px;
  border:2px solid rgba(56,239,125,0.45);
  padding:48px 56px;
  box-shadow:0 20px 60px rgba(0,0,0,0.80);
}
.explanation-title {
  font-size:38px; font-weight:800; color:#38ef7d;
  margin-bottom:22px; letter-spacing:1px;
}
.explanation-text {
  font-size:48px; font-weight:700; color:#fff; line-height:1.55;
  word-break:keep-all;
  text-shadow:0 2px 10px rgba(0,0,0,0.9);
}
.bonus-tip {
  margin-top:24px; padding-top:22px;
  border-top:1px solid rgba(255,255,255,0.12);
  font-size:40px; font-weight:600; color:#FF8C42;
}

/* 진행 점 */
.dots { position:absolute; bottom:265px; left:50%; transform:translateX(-50%);
        display:flex; gap:14px; align-items:center; }
.dot  { width:16px; height:16px; border-radius:50%; background:rgba(255,255,255,0.28); }
.dot.active { width:44px; border-radius:8px; background:#38ef7d; }
</style>
</head><body>
<div class="top-fade"></div>
<div class="bottom-fade"></div>

<div class="badge">✅ 정답 공개!</div>

<div class="answer-area">
  <div class="answer-label">정답은</div>
  <div class="answer-text">${esc(quiz.answerText)}</div>
</div>

<div class="explanation-card">
  <div class="explanation-title">💡 이유는?</div>
  <div class="explanation-text">${esc(quiz.explanation)}</div>
  ${quiz.bonusTip ? `<div class="bonus-tip">⭐ ${esc(quiz.bonusTip)}</div>` : ''}
</div>

<div class="dots">
  <div class="dot"></div><div class="dot"></div>
  <div class="dot active"></div>
  <div class="dot"></div>
</div>
</body></html>`;
}

// ─── 4-D. 아웃트로 슬라이드 오버레이 ────────────────────────────────────────
function makeOutroHtml() {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:${FONT}; }

.overlay { position:absolute; inset:0;
  background:linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 45%, rgba(0,0,0,0.30) 100%); }

/* 중앙 콘텐츠 */
.content {
  position:absolute;
  top:50%; left:50%; transform:translate(-50%,-50%);
  width:980px; text-align:center;
}
.emoji { font-size:130px; line-height:1; margin-bottom:30px; }
.main-text {
  font-size:76px; font-weight:900; color:#FFE066; line-height:1.3;
  word-break:keep-all;
  text-shadow:0 0 50px rgba(255,200,0,0.4), 0 4px 20px rgba(0,0,0,0.95);
  margin-bottom:20px;
}
.divider {
  width:160px; height:5px; background:rgba(255,255,255,0.35);
  border-radius:3px; margin:24px auto;
}
.action-text {
  font-size:56px; font-weight:800; color:#fff; line-height:1.5;
  word-break:keep-all;
  text-shadow:0 3px 14px rgba(0,0,0,0.95);
}
.save-text {
  margin-top:22px;
  font-size:48px; font-weight:700; color:rgba(255,255,255,0.75);
  word-break:keep-all;
}

/* 브랜드 */
.brand {
  position:absolute; bottom:330px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:12px;
  background:rgba(0,0,0,0.40); backdrop-filter:blur(8px);
  border-radius:50px; padding:14px 36px;
}
.brand-icon { font-size:32px; }
.brand-name  { font-size:30px; font-weight:800; color:#fff; }

/* 진행 점 */
.dots { position:absolute; bottom:260px; left:50%; transform:translateX(-50%);
        display:flex; gap:14px; align-items:center; }
.dot  { width:16px; height:16px; border-radius:50%; background:rgba(255,255,255,0.28); }
.dot.active { width:44px; border-radius:8px; background:#E8631A; }
</style>
</head><body>
<div class="overlay"></div>
<div class="content">
  <div class="emoji">💬</div>
  <div class="main-text">당신은 몇 번이었나요?</div>
  <div class="divider"></div>
  <div class="action-text">댓글로 남겨주세요!</div>
  <div class="save-text">🔖 저장하시고<br>다양한 정보 받아가세요 💪</div>
</div>
<div class="brand">
  <span class="brand-icon">💪</span>
  <span class="brand-name">다이어트·운동 백과</span>
</div>
<div class="dots">
  <div class="dot"></div><div class="dot"></div><div class="dot"></div>
  <div class="dot active"></div>
</div>
</body></html>`;
}

// ─── 5. 썸네일 HTML (퀴즈 스타일) ───────────────────────────────────────────
function makeThumbnailHtml(youtubeTitle, question) {
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const cleanTitle = youtubeTitle.replace(/#Shorts/gi, '').trim();

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:${FONT}; }
.gradient  { position:absolute; inset:0;
  background:linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.70) 45%, rgba(0,0,0,0.20) 80%, transparent 100%); }
.top-fade  { position:absolute; top:0; left:0; right:0; height:360px;
  background:linear-gradient(to bottom, rgba(0,0,0,0.70), transparent); }

/* 상단 배지 */
.badge {
  position:absolute; top:60px; left:50%; transform:translateX(-50%);
  background:linear-gradient(135deg,#E8631A,#FF8C42);
  border-radius:60px; padding:22px 72px;
  font-size:50px; font-weight:900; color:#fff;
  white-space:nowrap; letter-spacing:2px;
  box-shadow:0 10px 40px rgba(232,99,26,0.60);
}

/* 퀴즈 질문 */
.question-box {
  position:absolute;
  top:230px; left:60px; right:60px;
  background:rgba(0,0,0,0.65);
  backdrop-filter:blur(12px);
  border:3px solid rgba(255,255,255,0.20);
  border-radius:30px; padding:44px 52px;
  text-align:center;
}
.q-label { font-size:38px; font-weight:700; color:rgba(255,255,255,0.60); margin-bottom:12px; }
.q-text  { font-size:72px; font-weight:900; color:#FFE066; line-height:1.3;
  word-break:keep-all;
  text-shadow:0 0 40px rgba(255,200,0,0.40), 0 4px 18px rgba(0,0,0,0.95); }

/* 하단 제목 */
.title-area {
  position:absolute; bottom:170px; left:0; right:0;
  padding:0 72px; text-align:center;
}
.title-text {
  font-size:78px; font-weight:900; color:#fff; line-height:1.25;
  word-break:keep-all; text-shadow:0 4px 20px rgba(0,0,0,0.95);
}

/* 브랜드 */
.brand { position:absolute; bottom:80px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:12px;
  background:rgba(0,0,0,0.40); border-radius:50px; padding:12px 32px; }
.brand-icon { font-size:32px; }
.brand-name  { font-size:30px; font-weight:800; color:#fff; }
</style>
</head><body>
<div class="gradient"></div>
<div class="top-fade"></div>
<div class="badge">👑 이거 알면 천재!</div>
<div class="question-box">
  <div class="q-label">Q. 퀴즈</div>
  <div class="q-text">${esc(question || cleanTitle)}</div>
</div>
<div class="title-area">
  <div class="title-text">${esc(cleanTitle)}</div>
</div>
<div class="brand">
  <span class="brand-icon">💪</span>
  <span class="brand-name">다이어트·운동 백과</span>
</div>
</body></html>`;
}

// ─── 6. 슬라이드 클립 합성 (오디오 없음 — BGM은 나중에 삽입) ─────────────────
function createSlideClip(imagePath, overlayPath, duration, outPath) {
  return new Promise((resolve, reject) => {
    const d = duration.toFixed(2);
    ffmpeg()
      .input(imagePath).inputOptions(['-loop', '1', '-framerate', '25'])
      .input(overlayPath)
      .input('anullsrc=r=44100:cl=stereo').inputOptions(['-f', 'lavfi'])
      .complexFilter([
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg]`,
        `[bg][1:v]overlay=0:0:eof_action=repeat,` +
        `fade=t=in:st=0:d=0.35,` +
        `fade=t=out:st=${(parseFloat(d) - 0.45).toFixed(2)}:d=0.45[out]`,
      ])
      .outputOptions([
        '-map', '[out]',
        '-map', '2:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k',
        '-pix_fmt', 'yuv420p',
        '-t', d,
        '-movflags', '+faststart',
      ])
      .output(outPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// ─── 7. 클립 이어붙이기 ──────────────────────────────────────────────────────
function concatClips(clipPaths, outPath) {
  return new Promise((resolve, reject) => {
    const listFile = outPath.replace('.mp4', '_list.txt');
    fs.writeFileSync(listFile, clipPaths.map((p) => `file '${p}'`).join('\n'));
    ffmpeg()
      .input(listFile).inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
      ])
      .output(outPath)
      .on('progress', (p) => process.stdout.write(`\r  합성 중: ${Math.round(p.percent || 0)}%`))
      .on('end', () => { console.log(''); fs.unlinkSync(listFile); resolve(); })
      .on('error', reject)
      .run();
  });
}

// ─── 8. BGM 삽입 (기존 무음 오디오를 BGM으로 교체) ──────────────────────────
function addBGMToVideo(videoPath, bgmPath, outPath, totalDuration) {
  const fadeOutSt = Math.max(1, (totalDuration || 45) - 3.5).toFixed(2);
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(bgmPath).inputOptions(['-stream_loop', '-1'])
      .outputOptions([
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '128k',
        '-af', `volume=0.30,afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutSt}:d=3.0`,
        '-shortest',
        '-movflags', '+faststart',
      ])
      .output(outPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// ─── 9. 썸네일 합성 (배경이미지 + 오버레이) ─────────────────────────────────
function compositeThumbnail(bgPath, overlayPath, outPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(bgPath)
      .input(overlayPath)
      .complexFilter([
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg]`,
        `[bg][1:v]overlay=0:0[out]`,
      ])
      .map('[out]')
      .outputOptions(['-frames:v', '1', '-q:v', '2'])
      .output(outPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== 다이어트·운동 쇼츠 v8 (트렌디 디자인 + BGM + 꿀팁 데이터) ===\n');
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
    const post = postId
      ? await prisma.post.findUnique({ where: { id: parseInt(postId) }, include: { category: true } })
      : await prisma.post.findFirst({
          where: { status: 'PUBLISHED', shortsGenerated: false },
          orderBy: { publishedAt: 'desc' },
          include: { category: true },
        });

    if (!post) { console.log('쇼츠를 만들 글이 없습니다.'); return; }
    console.log(`대상 글: "${post.title}"\n`);

    // ── 1단계: GPT 퀴즈 스크립트 생성 ──────────────────────────────────────
    console.log('[1/4] 퀴즈 스크립트 생성...');
    const script = await generateShortsScript(post);
    const quiz   = script.quiz || {};
    console.log(`  제목:   ${script.youtubeTitle}`);
    console.log(`  퀴즈:   ${quiz.question}`);
    console.log(`  정답:   ${quiz.answerText}`);

    // ── 2단계: BGM 다운로드 ──────────────────────────────────────────────────
    console.log('\n[2/4] BGM 다운로드...');
    const bgmPath = path.join(tmpDir, 'bgm.mp3');
    const bgmReady = await downloadBGM(bgmPath);

    // ── 3단계: 클립 생성 (quiz → countdown×5 → answer → outro) ─────────────
    console.log('\n[3/4] 클립 생성...\n');
    const clipPaths = [];

    // 배경 이미지 다운로드 (quiz + answer 공용)
    const imgPath = path.join(tmpDir, 'img_0.jpg');
    const imgFallbacks = [
      quiz.imageQuery || 'fit woman thinking quiz workout gym',
      'fit woman fitness workout beautiful',
      'athletic woman healthy lifestyle sport',
    ];
    let imgOk = false;
    for (const q of imgFallbacks) {
      try { await downloadImage(q, imgPath); imgOk = true; break; }
      catch { console.log(`  ⚠️  이미지 재시도...`); }
    }
    if (!imgOk) { console.log('  ❌ 이미지 실패'); return; }

    // 헬퍼: Puppeteer로 오버레이 PNG 렌더링
    async function renderOverlay(html, outPath) {
      const pg = await browser.newPage();
      await pg.setViewport({ width: W, height: H });
      await pg.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 350));
      await pg.screenshot({ path: outPath, omitBackground: true });
      await pg.close();
    }

    // [A] QUIZ 첫 등장 클립 (3초) — 선택지만 보여주기
    console.log('  ── [1] QUIZ 첫 등장 3초 ──');
    {
      const ovPath   = path.join(tmpDir, 'ov_quiz.png');
      const clipPath = path.join(tmpDir, 'clip_00.mp4');
      await renderOverlay(makeQuizHtml(quiz, null), ovPath);
      process.stdout.write('     🎬 quiz 합성...');
      await createSlideClip(imgPath, ovPath, 3, clipPath);
      console.log(' ✅'); clipPaths.push(clipPath);
    }

    // [B] COUNTDOWN 클립 (5→1, 각 1초) — 퀴즈 선택지 위에 숫자 표시
    console.log('  ── [2] COUNTDOWN 5→1 (퀴즈 위에 표시) ──');
    for (let n = 5; n >= 1; n--) {
      const ovPath   = path.join(tmpDir, `ov_cd${n}.png`);
      const clipPath = path.join(tmpDir, `clip_cd${n}.mp4`);
      await renderOverlay(makeQuizHtml(quiz, n), ovPath);   // 퀴즈 layout + 카운트다운 숫자
      process.stdout.write(`     🎬 ${n}초...`);
      await createSlideClip(imgPath, ovPath, SLIDE_DURATIONS.countdown, clipPath);
      console.log(' ✅'); clipPaths.push(clipPath);
    }

    // [C] ANSWER 클립 (12초) — 다른 이미지 시도
    console.log('  ── [3] ANSWER 12초 ──');
    {
      const ansImgPath = path.join(tmpDir, 'img_ans.jpg');
      let ansImgOk = false;
      const ansQueries = ['fit woman smiling confident healthy happy', 'fit woman fitness gym workout beautiful'];
      for (const q of ansQueries) {
        try { await downloadImage(q, ansImgPath); ansImgOk = true; break; }
        catch { /* try next */ }
      }
      const finalAnsImg = ansImgOk ? ansImgPath : imgPath;

      const ovPath   = path.join(tmpDir, 'ov_answer.png');
      const clipPath = path.join(tmpDir, 'clip_02.mp4');
      await renderOverlay(makeAnswerHtml(quiz), ovPath);
      process.stdout.write('     🎬 answer 합성...');
      await createSlideClip(finalAnsImg, ovPath, SLIDE_DURATIONS.answer, clipPath);
      console.log(' ✅'); clipPaths.push(clipPath);
    }

    // [D] OUTRO 클립 (6초)
    console.log('  ── [4] OUTRO 6초 ──');
    {
      const outroImgPath = path.join(tmpDir, 'img_outro.jpg');
      let outroOk = false;
      try { await downloadImage('fit woman celebrating workout success happy', outroImgPath); outroOk = true; }
      catch { /* use main img */ }

      const ovPath   = path.join(tmpDir, 'ov_outro.png');
      const clipPath = path.join(tmpDir, 'clip_03.mp4');
      await renderOverlay(makeOutroHtml(), ovPath);
      process.stdout.write('     🎬 outro 합성...');
      await createSlideClip(outroOk ? outroImgPath : imgPath, ovPath, SLIDE_DURATIONS.outro, clipPath);
      console.log(' ✅'); clipPaths.push(clipPath);
    }

    if (clipPaths.length === 0) { console.log('클립 생성 실패'); return; }

    // ── 4단계: 최종 영상 합성 + BGM ─────────────────────────────────────────
    console.log('\n[4/4] 최종 영상 합성...');
    const rawPath = path.join(tmpDir, 'raw.mp4');
    await concatClips(clipPaths, rawPath);

    // 총 재생시간: quiz첫등장(3) + countdown(5×1) + answer(12) + outro(6) = 26초
    const totalDuration = 3 + (5 * SLIDE_DURATIONS.countdown)
                        + SLIDE_DURATIONS.answer + SLIDE_DURATIONS.outro;

    let finalPath = rawPath;
    if (bgmReady && fs.existsSync(bgmPath)) {
      finalPath = path.join(tmpDir, 'final.mp4');
      process.stdout.write('  🎵 BGM 삽입...');
      await addBGMToVideo(rawPath, bgmPath, finalPath, totalDuration);
      console.log(' ✅');
    }
    const sizeMB = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
    console.log(`  완성: ${sizeMB}MB\n`);

    // ── 썸네일 생성 ──────────────────────────────────────────────────────────
    const thumbOverlayPath = path.join(tmpDir, 'thumb_overlay.png');
    const thumbJpgPath     = path.join(tmpDir, 'thumb.jpg');
    try {
      const thumbPage = await browser.newPage();
      await thumbPage.setViewport({ width: W, height: H });
      await thumbPage.setContent(makeThumbnailHtml(script.youtubeTitle, quiz.question), { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 500));
      await thumbPage.screenshot({ path: thumbOverlayPath, omitBackground: true });
      await thumbPage.close();

      const firstImg = path.join(tmpDir, 'img_0.jpg');
      if (fs.existsSync(firstImg)) {
        await compositeThumbnail(firstImg, thumbOverlayPath, thumbJpgPath);
        console.log('  📸 썸네일 생성 완료\n');
      }
    } catch (e) {
      console.log(`  ⚠️  썸네일 실패: ${e.message}\n`);
    }

    // ── 로컬 저장 ────────────────────────────────────────────────────────────
    const savePath = path.join(outDir, `${post.slug}.mp4`);
    fs.copyFileSync(finalPath, savePath);
    if (fs.existsSync(thumbJpgPath)) {
      fs.copyFileSync(thumbJpgPath, path.join(outDir, `${post.slug}-thumb.jpg`));
    }
    console.log(`💾 영상 저장: ${savePath}`);

    // ── YouTube 업로드 ────────────────────────────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://smartinfohealth.co.kr';
    const postUrl = `${siteUrl}/${post.category.slug}/${post.slug}`;
    const fullDesc =
      `📖 전체 내용 블로그에서 확인하세요 👇\n${postUrl}\n\n` +
      `${script.description || ''}\n\n` +
      `이 영상이 도움이 됐다면 구독 & 좋아요! 💪\n` +
      `매일 새로운 다이어트·운동 꿀팁을 쇼츠로 전해드립니다.\n\n` +
      `─────────────────────\n` +
      `${(script.tags || []).map((t) => '#' + t.replace(/\s/g,'')).join(' ')} #Shorts #다이어트 #운동 #피트니스`;

    if (process.env.YOUTUBE_REFRESH_TOKEN) {
      const { uploadToYouTube, uploadThumbnail, postComment } = require('./youtube-uploader');
      console.log('\n  업로드 진행...');
      const videoId = await uploadToYouTube({
        videoPath: finalPath,
        title: script.youtubeTitle,
        description: fullDesc,
        tags: [...(script.tags || []), '다이어트', '운동', '피트니스', '쇼츠', 'Shorts'],
        categoryId: '26',
      });

      if (fs.existsSync(thumbJpgPath)) {
        try {
          await uploadThumbnail({ videoId, thumbnailPath: thumbJpgPath });
          console.log('  ✅ 썸네일 업로드 완료');
        } catch (e) { console.log(`  ⚠️  썸네일 실패: ${e.message}`); }
      }

      try {
        await postComment({ videoId, text: `📖 더 자세한 내용은 블로그에서 확인하세요 👇\n${postUrl}` });
        console.log('  ✅ 블로그 링크 댓글 완료');
      } catch { /* 댓글 스코프 없으면 스킵 */ }

      await prisma.post.update({
        where: { id: post.id },
        data: { shortsGenerated: true, shortsVideoId: videoId },
      });
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
