/**
 * YouTube Shorts 자동 생성 스크립트 v8
 * 타겟: 10~30대 여성
 * 변경사항:
 *   ① 이미지: 젊고 세련된 여성 (인종 무관, 피트니스 모델 스타일)
 *   ② 디자인: 풀스크린 트렌디 (흰 바 제거, 그라디언트 오버레이)
 *   ③ 콘텐츠: 전문 꿀팁 (kcal·세트·횟수 수치 필수)
 *   ④ 오디오: TTS 제거 → 로열티 프리 BGM
 *   ⑤ 정보 카드: DATA 슬라이드에 식단표/운동표 표시
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

// ─── BGM 트랙 목록 (로열티 프리 — Mixkit) ────────────────────────────────────
const BGM_TRACKS = [
  'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-keep-up-953.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-upbeat-driving-154.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-feeling-happy-5.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-pop-celebration-3-438.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
];

// ─── 슬라이드 유형별 표시 시간(초) ──────────────────────────────────────────
const SLIDE_DURATIONS = {
  hook:    7,
  fact:    9,
  howto:   10,
  data:    12,
  summary: 7,
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

// ─── 1. GPT 스크립트 생성 (전문 꿀팁 + 수치 필수) ────────────────────────────
async function generateShortsScript(post) {
  const topicId = detectTopic(post);
  const config  = TOPIC_CONFIG[topicId] || TOPIC_CONFIG.weightloss;
  const imgQ    = config.imageQueries[Math.floor(Math.random() * config.imageQueries.length)];
  const isNutrition = config.dataType === 'nutrition';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.82,
    max_tokens: 2200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `당신은 10~30대 여성을 위한 다이어트·운동 쇼츠 전문 크리에이터입니다.
국가공인 트레이너 + 영양사처럼 꿀팁을 알려주는 콘텐츠를 만듭니다.

⚡ 핵심 원칙:
① 반드시 구체적 수치 포함 (가장 중요):
   - 식단 → 실제 음식명 + kcal 수치 + 그램 수 (예: 닭가슴살 100g = 165kcal)
   - 운동 → 세트 수 + 횟수 + 무게 기준 + 자세 꿀팁 (예: 3세트×12회, 2~3kg)
   - 기간 → "2주", "4주", "하루 15분" 등
② 전문가 꿀팁 스타일 — 트레이너가 직접 귀띔해주는 느낌
③ 시청자가 보고 "진짜 도움됐다!" 느껴야 함
④ 짧고 임팩트 있는 문장 (한 문장 18~26자)
⑤ 긍정적이고 따뜻한 어조. 공포·부정 표현 금지

슬라이드 구조 (5개):
[1 HOOK  ] 눈에 확 들어오는 질문·팩트로 시작
[2 FACT  ] 구체적 수치·연구 결과·전문 지식
[3 HOW-TO] 단계별 실천 방법 (번호 포함 가능)
[4 DATA  ] 실제 데이터 카드 (식단 kcal표 or 운동 세트표)
[5 SUMMARY] 오늘 바로 실천할 것 1가지`,
      },
      {
        role: 'user',
        content: `블로그 제목: ${post.title}
블로그 요약: ${post.excerpt || ''}

10~30대 여성이 끝까지 보게 되는 쇼츠 스크립트를 만들어주세요.

⚠️ DATA 슬라이드 규칙:
${isNutrition
  ? '- 실제 식품명 + kcal 수치 3개 항목 이상 포함 (예: 닭가슴살 100g → 165kcal)'
  : '- 운동명 + 세트×횟수 + 무게 기준 3개 항목 이상 (예: 스쿼트 → 3세트×15회)'}

아래 JSON으로만 응답 (다른 텍스트 없이):
{
  "youtubeTitle": "유튜브 제목 40자 이내 #Shorts (숫자·꿀팁 느낌 포함)",
  "hookText": "썸네일 강조 문구 8자 이내",
  "description": "영상 설명 70자 이내",
  "tags": ["다이어트", "운동", "피트니스", "관련태그1", "관련태그2"],
  "slides": [
    {
      "type": "hook",
      "narration": "첫 문장 (20자 내외)\\n둘째 문장 (20자 내외)\\n셋째 문장 (20자 내외)",
      "keyword": "핵심 강조어 3~5자",
      "imageQuery": "${imgQ}"
    },
    {
      "type": "fact",
      "narration": "팩트 첫 문장\\n팩트 둘째 문장 (수치 포함)\\n팩트 셋째 문장",
      "keyword": "구체적 수치",
      "imageQuery": "fit woman fitness gym workout beautiful"
    },
    {
      "type": "howto",
      "narration": "방법 첫 문장\\n방법 둘째 문장 (단계별)\\n방법 셋째 문장",
      "keyword": "핵심 행동어",
      "imageQuery": "athletic woman exercise training healthy"
    },
    {
      "type": "data",
      "narration": "데이터 소개 첫 문장\\n수치 강조 둘째 문장\\n오늘 바로 해보세요!",
      "keyword": "${isNutrition ? '총 kcal' : '세트 수'}",
      "imageQuery": "${isNutrition ? 'healthy meal prep food nutrition colorful' : 'gym equipment weights fitness'}",
      "cardData": {
        "title": "${isNutrition ? '🥗 추천 식단 예시' : '💪 추천 운동 루틴'}",
        "items": [
          {"label": "${isNutrition ? '음식명 + 양' : '운동명'}", "value": "${isNutrition ? 'Xkcal' : 'X세트×X회'}"},
          {"label": "항목2", "value": "수치2"},
          {"label": "항목3", "value": "수치3"}
        ],
        "total": "${isNutrition ? '합계 XXXkcal' : '총 XX분'}"
      }
    },
    {
      "type": "summary",
      "narration": "핵심 요약 첫 문장\\n오늘 할 것 한 가지 (구체적)\\n응원 마무리 문장",
      "keyword": "핵심 단어",
      "imageQuery": "fit woman smiling confident healthy happy"
    }
  ]
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

// ─── 3. BGM 다운로드 ──────────────────────────────────────────────────────────
async function downloadBGM(outPath) {
  const shuffled = [...BGM_TRACKS].sort(() => Math.random() - 0.5);
  for (const url of shuffled) {
    try {
      console.log(`  🎵 BGM: ${url.split('/').pop()}`);
      const res = await axios({ url, method: 'GET', responseType: 'stream', timeout: 15000 });
      const writer = fs.createWriteStream(outPath);
      res.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      if (fs.statSync(outPath).size > 10000) {
        console.log('  ✅ BGM 다운로드 완료');
        return true;
      }
    } catch (e) {
      console.log(`  ⚠️  BGM 실패: ${e.message}`);
    }
  }
  console.log('  ⚠️  BGM 없음 — 무음으로 진행');
  return false;
}

// ─── 4. 오버레이 HTML (풀스크린 트렌디 디자인) ──────────────────────────────
function makeOverlayHtml(slide, slideIdx, totalSlides) {
  const { narration = '', keyword = '', type = 'body', cardData } = slide;
  const lines   = narration.split('\n').filter(Boolean);
  const isHook  = type === 'hook';
  const isData  = type === 'data';
  const isSummary = type === 'summary';

  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // 진행 점
  const dots = Array.from({ length: totalSlides }, (_, i) =>
    `<div class="dot${i === slideIdx ? ' active' : ''}"></div>`
  ).join('');

  // 배지 라벨
  const badgeLabel = isHook ? '✅ 꿀팁' :
    type === 'fact'   ? '📊 팩트' :
    type === 'howto'  ? '🔥 방법' :
    isData            ? '📋 데이터' : '💪 실천';

  const badgeBg = isHook    ? 'linear-gradient(135deg,#E8631A,#FF8C42)' :
                  isData    ? 'linear-gradient(135deg,#6C63FF,#9D4EDD)' :
                  isSummary ? 'linear-gradient(135deg,#11998e,#38ef7d)' :
                              'rgba(0,0,0,0.45)';

  // 정보 카드 HTML
  const cardHtml = isData && cardData ? `
<div class="info-card">
  <div class="card-title">${esc(cardData.title)}</div>
  ${(cardData.items || []).map((item) =>
    `<div class="card-item">
       <span class="card-label">${esc(item.label)}</span>
       <span class="card-value">${esc(item.value)}</span>
     </div>`).join('')}
  ${cardData.total ? `
  <div class="card-total">
    <span class="card-total-label">합계</span>
    <span class="card-total-value">${esc(cardData.total)}</span>
  </div>` : ''}
</div>` : '';

  // 자막 줄
  const captionHtml = lines.map((line, i) =>
    `<span class="caption-line${i === 0 && isHook ? ' highlight' : ''}">${esc(line)}</span>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body {
  width:${W}px; height:${H}px;
  background:transparent; overflow:hidden;
  font-family:${FONT};
}

/* 하단 그라디언트 (이미지 위) */
.gradient-overlay {
  position:absolute; bottom:0; left:0; right:0;
  height:${isData ? '300px' : '1050px'};
  background:linear-gradient(to top,
    rgba(0,0,0,0.97) 0%,
    rgba(0,0,0,0.82) 35%,
    rgba(0,0,0,0.25) 70%,
    transparent 100%
  );
}

/* 상단 페이드 */
.top-fade {
  position:absolute; top:0; left:0; right:0; height:260px;
  background:linear-gradient(to bottom, rgba(0,0,0,0.60), transparent);
}

/* 브랜드 워터마크 */
.brand {
  position:absolute; top:38px; left:44px;
  display:flex; align-items:center; gap:12px;
  background:rgba(0,0,0,0.38);
  backdrop-filter:blur(8px);
  border-radius:50px; padding:10px 26px;
}
.brand-icon { font-size:30px; line-height:1; }
.brand-name { font-size:28px; font-weight:800; color:#fff; letter-spacing:-0.5px; }

/* 슬라이드 타입 배지 */
.type-badge {
  position:absolute; top:38px; right:44px;
  background:${badgeBg};
  border-radius:50px; padding:12px 32px;
  font-size:28px; font-weight:800; color:#fff;
  letter-spacing:1px;
  box-shadow:0 4px 16px rgba(0,0,0,0.35);
}

/* 키워드 강조 (중앙) */
${!isData ? `.keyword-area {
  position:absolute;
  top:${isHook ? '520px' : '600px'};
  left:50%; transform:translateX(-50%);
  width:1000px; text-align:center;
}
.keyword-text {
  font-size:${isHook ? '124px' : '104px'};
  font-weight:900;
  color:${isSummary ? '#7EFFC5' : '#FFE066'};
  line-height:1.2; word-break:keep-all;
  text-shadow:
    0 0 50px rgba(255,160,0,0.65),
    0 5px 20px rgba(0,0,0,0.98),
    -4px -4px 0 rgba(0,0,0,0.55),
    4px 4px 0 rgba(0,0,0,0.55);
  letter-spacing:-3px;
}` : ''}

/* 정보 카드 */
.info-card {
  position:absolute;
  top:50%; left:50%;
  transform:translate(-50%, -50%);
  width:950px;
  background:rgba(8,8,8,0.92);
  backdrop-filter:blur(18px);
  border-radius:36px;
  border:2px solid rgba(232,99,26,0.70);
  padding:52px 60px;
  box-shadow:0 24px 80px rgba(0,0,0,0.85);
}
.card-title {
  font-size:54px; font-weight:900; color:#FFE066;
  text-align:center; margin-bottom:40px;
  padding-bottom:28px;
  border-bottom:2px solid rgba(255,255,255,0.14);
}
.card-item {
  display:flex; justify-content:space-between; align-items:center;
  padding:20px 0;
  border-bottom:1px solid rgba(255,255,255,0.08);
}
.card-label { font-size:42px; font-weight:600; color:rgba(255,255,255,0.88); }
.card-value { font-size:46px; font-weight:900; color:#FF8C42; }
.card-total {
  margin-top:30px;
  display:flex; justify-content:space-between; align-items:center;
  background:rgba(232,99,26,0.22);
  border:1px solid rgba(232,99,26,0.45);
  border-radius:18px; padding:22px 30px;
}
.card-total-label { font-size:46px; font-weight:900; color:#fff; }
.card-total-value { font-size:54px; font-weight:900; color:#FFE066; }

/* 자막 */
.caption-area {
  position:absolute;
  bottom:140px; left:0; right:0;
  padding:0 64px; text-align:center;
}
.caption-line {
  font-size:${isData ? '50px' : '58px'};
  font-weight:900; color:#ffffff;
  line-height:1.55; word-break:keep-all;
  text-shadow:0 3px 14px rgba(0,0,0,0.98), 0 0 40px rgba(0,0,0,0.7);
  display:block; margin-bottom:4px;
}
.caption-line.highlight { color:#FFE066; font-size:62px; }

/* 진행 점 */
.progress-dots {
  position:absolute; bottom:52px; left:50%; transform:translateX(-50%);
  display:flex; gap:14px; align-items:center;
}
.dot { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,0.28); }
.dot.active { width:40px; height:14px; border-radius:7px; background:#E8631A; }
</style>
</head>
<body>

<div class="gradient-overlay"></div>
<div class="top-fade"></div>

<div class="brand">
  <span class="brand-icon">💪</span>
  <span class="brand-name">다이어트·운동 백과</span>
</div>

<div class="type-badge">${badgeLabel}</div>

${!isData && keyword ? `<div class="keyword-area"><div class="keyword-text">${esc(keyword)}</div></div>` : ''}

${cardHtml}

<div class="caption-area">${captionHtml}</div>

<div class="progress-dots">${dots}</div>

</body>
</html>`;
}

// ─── 5. 썸네일 HTML ───────────────────────────────────────────────────────────
function makeThumbnailHtml(youtubeTitle, hookText) {
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const cleanTitle = youtubeTitle.replace('#Shorts', '').trim();

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body {
  width:${W}px; height:${H}px;
  background:transparent; overflow:hidden;
  font-family:${FONT};
}
.gradient {
  position:absolute; inset:0;
  background:linear-gradient(to top,
    rgba(0,0,0,0.97) 0%,
    rgba(0,0,0,0.65) 45%,
    rgba(0,0,0,0.15) 75%,
    transparent 100%
  );
}
.top-fade {
  position:absolute; top:0; left:0; right:0; height:320px;
  background:linear-gradient(to bottom, rgba(0,0,0,0.65), transparent);
}
.brand {
  position:absolute; top:48px; left:56px;
  display:flex; align-items:center; gap:14px;
}
.brand-icon { font-size:52px; }
.brand-name { font-size:44px; font-weight:900; color:#fff; }

.hook-badge {
  position:absolute;
  top:170px; left:50%; transform:translateX(-50%);
  background:linear-gradient(135deg,#E8631A,#FF8C42);
  border-radius:60px; padding:20px 64px;
  font-size:44px; font-weight:900; color:#fff;
  white-space:nowrap;
  box-shadow:0 10px 40px rgba(232,99,26,0.55);
}

.title-area {
  position:absolute;
  bottom:155px; left:0; right:0;
  padding:0 64px; text-align:center;
}
.title-text {
  font-size:90px; font-weight:900; color:#fff;
  line-height:1.2; word-break:keep-all;
  text-shadow:0 5px 24px rgba(0,0,0,0.95);
}
.sub-text {
  margin-top:28px;
  font-size:44px; font-weight:700;
  color:rgba(255,255,255,0.70);
}
.dots {
  position:absolute; bottom:60px; left:50%; transform:translateX(-50%);
  display:flex; gap:16px; align-items:center;
}
.dot { width:16px; height:16px; border-radius:50%; background:rgba(255,255,255,0.35); }
.dot.first { background:#E8631A; width:40px; border-radius:8px; }
</style>
</head>
<body>
<div class="gradient"></div>
<div class="top-fade"></div>
<div class="brand"><span class="brand-icon">💪</span><span class="brand-name">다이어트·운동 백과</span></div>
<div class="hook-badge">✅ ${esc(hookText || '꿀팁 공개')}</div>
<div class="title-area">
  <div class="title-text">${esc(cleanTitle)}</div>
  <div class="sub-text">smartinfohealth.co.kr</div>
</div>
<div class="dots">
  <div class="dot first"></div>
  <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
</div>
</body>
</html>`;
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
function addBGMToVideo(videoPath, bgmPath, outPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(bgmPath).inputOptions(['-stream_loop', '-1'])
      .outputOptions([
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '128k',
        '-af', 'volume=0.32,afade=t=in:st=0:d=1.5,afade=t=out:st=40:d=5',
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

    // ── 1단계: GPT 스크립트 생성 ─────────────────────────────────────────────
    console.log('[1/4] 쇼츠 스크립트 생성...');
    const script = await generateShortsScript(post);
    const slides = (script.slides || []).slice(0, 5);
    console.log(`  제목: ${script.youtubeTitle}`);
    console.log(`  슬라이드: ${slides.length}개`);
    slides.forEach((s, i) => {
      const dur = SLIDE_DURATIONS[s.type] || 9;
      console.log(`    ${i + 1}. [${s.type}/${dur}초] ${s.narration.replace(/\n/g,' / ').slice(0,35)}...`);
    });

    // ── 2단계: BGM 다운로드 ──────────────────────────────────────────────────
    console.log('\n[2/4] BGM 다운로드...');
    const bgmPath = path.join(tmpDir, 'bgm.mp3');
    const bgmReady = await downloadBGM(bgmPath);

    // ── 3단계: 슬라이드 클립 생성 ────────────────────────────────────────────
    console.log('\n[3/4] 클립 생성...\n');
    const clipPaths = [];

    for (let i = 0; i < slides.length; i++) {
      const slide    = slides[i];
      const duration = SLIDE_DURATIONS[slide.type] || 9;
      console.log(`  ── 슬라이드 ${i + 1}/${slides.length} [${slide.type}] ${duration}초 ──`);

      // 이미지 다운로드
      const imgPath = path.join(tmpDir, `img_${i}.jpg`);
      const fallbacks = [
        slide.imageQuery,
        'fit woman fitness workout beautiful',
        'athletic woman healthy lifestyle sport',
      ];
      let imgOk = false;
      for (const q of fallbacks) {
        try {
          console.log(`     🖼️  "${q}"`);
          await downloadImage(q, imgPath);
          imgOk = true;
          break;
        } catch { console.log(`     ⚠️  재시도...`); }
      }
      if (!imgOk) { console.log('     ❌ 이미지 실패, 스킵'); continue; }

      // 오버레이 렌더링 (Puppeteer)
      const overlayPath = path.join(tmpDir, `overlay_${i}.png`);
      const overPage = await browser.newPage();
      await overPage.setViewport({ width: W, height: H });
      await overPage.setContent(makeOverlayHtml(slide, i, slides.length), { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 450));
      await overPage.screenshot({ path: overlayPath, omitBackground: true });
      await overPage.close();

      // 클립 합성
      const clipPath = path.join(tmpDir, `clip_${String(i).padStart(2,'0')}.mp4`);
      process.stdout.write(`     🎬 클립 합성...`);
      await createSlideClip(imgPath, overlayPath, duration, clipPath);
      console.log(' ✅');
      clipPaths.push(clipPath);
    }

    if (clipPaths.length === 0) { console.log('클립 생성 실패'); return; }

    // ── 4단계: 최종 영상 합성 + BGM ─────────────────────────────────────────
    console.log('\n[4/4] 최종 영상 합성...');
    const rawPath   = path.join(tmpDir, 'raw.mp4');
    await concatClips(clipPaths, rawPath);

    let finalPath = rawPath;
    if (bgmReady && fs.existsSync(bgmPath)) {
      finalPath = path.join(tmpDir, 'final.mp4');
      process.stdout.write('  🎵 BGM 삽입...');
      await addBGMToVideo(rawPath, bgmPath, finalPath);
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
      await thumbPage.setContent(makeThumbnailHtml(script.youtubeTitle, script.hookText), { waitUntil: 'domcontentloaded' });
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
