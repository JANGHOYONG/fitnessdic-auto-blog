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

/** Neon DB 콜드스타트 대비 재시도 래퍼 */
async function withRetry(fn, retries = 4, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isDbErr = e.message && (e.message.includes("Can't reach database") || e.message.includes('connect') || e.message.includes('ECONNREFUSED'));
      if (isDbErr && i < retries - 1) {
        console.log(`  ⚠️ DB 연결 실패 (${i + 1}/${retries}). ${delayMs / 1000}초 후 재시도...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw e;
      }
    }
  }
}

const args   = process.argv.slice(2);
const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
};

const W    = 1080;
const H    = 1920;
const FONT = `'Noto Sans CJK KR','Apple SD Gothic Neo','맑은 고딕','Malgun Gothic',sans-serif`;

// ─── 이모티콘 제거 (TTS 전달 전 사용) ───────────────────────────────────────
function stripEmoji(str) {
  return String(str || '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u2600-\u27FF]/gu, '')
    .replace(/[\uFE00-\uFE0F]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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

// ─── 1. GPT 스크립트 생성 (바이럴 v4 — 5슬라이드×3문장=15문장, ~50초) ─────────
async function generateShortsScript(post) {
  const topicId = detectTopic(post);
  const config  = TOPIC_CONFIG[topicId] || TOPIC_CONFIG.weightloss;
  const imageHint = config.queries[0];

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.80,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `당신은 30~50대를 위한 유튜브 쇼츠 다이어트·운동 정보 전달 전문 작가입니다.

[참고할 성공 쇼츠 제목 패턴 — 이 스타일을 반드시 따를 것]
✅ "매일 스쿼트 했더니 살이 안 빠진 진짜 이유" → 반전 + 메커니즘
✅ "닭가슴살 대신에 이걸 드세요" → 통념 뒤집기 + 구체적 대안
✅ "40대에 살 안 빠지는 사람의 공통점" → 구체적 대상 + 충격 사실
✅ "하루 10분인데 체지방이 떨어진 운동" → 구체적 시간 + 결과 먼저
✅ "단백질 보충제보다 효과 좋은 진짜 식품" → 비교 반전 + 정체 공개

[대본 핵심 철학 — 절대 원칙]
① 시청자가 이미 알고 있는 정보를 반복하면 즉시 실격.
   "채소 드세요", "운동하세요", "단백질 먹으세요" 같은 뻔한 말 절대 금지 ❌
   → 시청자가 "어, 이건 몰랐다" 또는 "내가 알던 게 틀렸네" 라고 느껴야 성공 ✅

② 반드시 포함할 3가지 요소:
   A. 반전 정보: 사람들이 흔히 알고 있는 것과 다른 사실 ("사실 OO이 문제가 아니라...")
   B. 구체적 메커니즘: 왜 그런지 원리 설명 ("인슐린이 분비되면서 지방 분해가 멈추는데...")
   C. 오늘 당장 실천: 영상 보고 나서 바로 할 수 있는 행동 1가지 (구체적 식품명·양·운동명·횟수)

③ 스토리텔링 구조 (고정 형식 금지):
   매번 아래 4가지 유형 중 하나를 선택:
   - [사례형] "OO세 OOO씨가 OO을 했더니 → 이유 → 당신도 이렇게"
   - [반전형] "대부분 OO이 좋다고 알고 있지만 → 실제로는 → 대신 이걸"
   - [발견형] "운동 전문가도 놀란 OO의 진짜 효과 → 메커니즘 → 실천법"
   - [비교형] "OO vs OO 어느 것이 더 효과적인가 → 결과 → 이유"

④ 문장 규칙:
   - 문장은 \\n으로 구분, 각 문장 15~25자 (구어체, 자연스러운 끊어 말하기)
   - 같은 어미("~입니다", "~합니다") 2번 이상 연속 금지
   - 수치는 반드시 포함 (예: "하루 30g", "4주 후", "체지방 7% 감소" 등)
   - 식품명·운동명은 구체적으로 (예: "단백질" → "두부 반 모", "운동" → "스쿼트 15회 3세트")

⑤ 슬라이드당 정확히 3문장, 전체 5슬라이드·15문장 (목표 50초 내외)
   슬라이드마다 새로운 정보 — 같은 내용 반복 절대 금지

⑥ 이미지 규칙: "fit woman" 또는 "athletic woman"으로 시작, 주제 관련 영어 단어 포함

⑦ 영상 안에서 핵심 정보를 완결해야 함 — "블로그에서 확인하세요"로만 끝내는 것 절대 금지 ❌`,
      },
      {
        role: 'user',
        content: `블로그 제목: ${post.title}
블로그 요약: ${post.excerpt}

[지시사항]
위 블로그 내용에서 시청자가 "이건 몰랐다!"고 느낄 핵심 정보 1가지를 뽑아서
아래 구조로 쇼츠 대본을 작성하세요.

⚠️ 필수 체크:
1. 훅(1번 슬라이드): 극단적 사례, 반전 질문, 또는 충격적 수치로 시작
2. 본문(2~4번): 메커니즘 → 반전 정보 → 구체적 실천법 순서로 전개
3. 구체적 수치/식품명/운동명 각 슬라이드 최소 1개 포함
4. 마무리(5번): "오늘 저녁부터 OO을 해보세요" 식의 즉시 실천 행동 1가지
5. 블로그 요약에 없는 내용을 지어내지 말 것 (있는 사실 안에서 가장 흥미로운 각도 선택)
6. 뻔한 상식("운동하세요", "채소 드세요", "단백질 드세요") 절대 쓰지 말 것

JSON 형식:
{
  "youtubeTitle": "유튜브 제목 (40자 이내, 반전/숫자/사례 포함, #Shorts 포함)",
  "hookText": "썸네일 강조 문구 (8~12자, 핵심 반전 단어)",
  "description": "영상 설명 (60~80자, 핵심 정보 요약) + '\\n전체 내용은 블로그에서 확인하세요 👇'",
  "tags": ["다이어트", "운동", "피트니스", "관련태그1", "관련태그2"],
  "scriptType": "선택한 구조 유형 (사례형/반전형/발견형/비교형)",
  "slides": [
    {
      "type": "hook",
      "narration": "극단적 사례 또는 반전 질문 문장\\n시청자의 궁금증 자극 문장\\n핵심 정보 예고 문장",
      "keyword": "핵심 반전 단어 (8자 이내)",
      "imageQuery": "fit woman workout ${imageHint}"
    },
    {
      "type": "body",
      "narration": "사람들이 흔히 믿는 것 언급\\n실제로는 이렇다는 반전 사실\\n구체적 수치나 연구 결과",
      "keyword": "반전 핵심어",
      "imageQuery": "fit woman 주제관련 영어단어"
    },
    {
      "type": "body",
      "narration": "왜 그런지 메커니즘 설명\\n몸 안에서 일어나는 구체적 변화\\n이것이 다이어트·운동에 미치는 영향",
      "keyword": "메커니즘 핵심어",
      "imageQuery": "athletic woman 주제관련 영어단어"
    },
    {
      "type": "body",
      "narration": "구체적 식품명/운동명 제시\\n정확한 양·횟수·시간 포함\\n흔히 하는 실수 또는 주의사항",
      "keyword": "실천 핵심어",
      "imageQuery": "fit woman healthy food 주제관련 영어단어"
    },
    {
      "type": "ending",
      "narration": "이 영상의 핵심 반전 요약\\n오늘 저녁부터 할 수 있는 행동 1가지 (구체적)\\n따뜻하고 기억에 남는 마무리",
      "keyword": "오늘의 실천",
      "imageQuery": "fit woman success happy bright smile"
    }
  ]
}`,
      },
    ],
  });
  return JSON.parse(res.choices[0].message.content);
}

// ─── 2. Pexels 이미지 다운로드 ────────────────────────────────────────────────
async function fetchPexelsPhoto(query, outPath) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error('PEXELS_API_KEY 없음');

  const searches = [
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&size=large&per_page=10`,
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10`,
  ];

  for (const url of searches) {
    const res = await axios.get(url, { headers: { Authorization: key } });
    const photos = res.data.photos || [];
    if (!photos.length) continue;

    const photo = photos[Math.floor(Math.random() * Math.min(5, photos.length))];
    const imageUrl = photo.src.large2x || photo.src.large || photo.src.original;

    const writer = fs.createWriteStream(outPath);
    const response = await axios({ url: imageUrl, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return;
  }
  throw new Error(`이미지 없음: "${query}"`);
}

// ─── 3. TTS 생성 (Google Cloud TTS - ko-KR-Wavenet-D, 1.2x) ─────────────────
async function generateAudio(narration, outPath) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY 환경변수가 없습니다.');

  // 이모티콘 제거 + \n → ", " 변환 (자연스러운 쉼 삽입)
  const ttsText = stripEmoji(narration.replace(/\n/g, ', '));

  const res = await axios.post(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      input: { text: ttsText },
      voice: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-D' },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.2,
      },
    }
  );
  const buf = Buffer.from(res.data.audioContent, 'base64');
  fs.writeFileSync(outPath, buf);
}

// 오디오 길이 측정 (초)
function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, meta) => {
      if (err) reject(err);
      else resolve(parseFloat(meta.format.duration));
    });
  });
}

// ─── 4. 오버레이 HTML - 키워드 강조 + 나레이션 (오렌지 피트니스 테마) ──────────
function makeOverlayHtml(narration, slideIdx, totalSlides, keyword = '', type = 'body') {
  const progress = Math.round((slideIdx / totalSlides) * 100);
  const isHook   = type === 'hook';
  const kwColor  = type === 'ending' ? '#7EFFC5' : '#FFD700';
  const progressColor = isHook
    ? 'linear-gradient(90deg, #E8631A, #FFD700)'
    : 'linear-gradient(90deg, #E8631A, #ff9f43)';

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

/* ① 상단 흰색 바 (y=0~190) */
.top-bar {
  position:absolute;
  top:0; left:0; right:0; height:190px;
  background:#ffffff;
  border-bottom:4px solid rgba(232,99,26,0.25);
  display:flex; align-items:center; justify-content:center;
}
.brand-inner {
  display:flex; align-items:center; gap:16px;
}
.brand-icon { font-size:48px; line-height:1; }
.brand-text  { font-size:44px; font-weight:900; color:#E8631A; letter-spacing:1px; }

/* ② 이미지 창 위 — 훅 배지 (hook 슬라이드) */
.hook-badge {
  position:absolute;
  top:220px; left:50%; transform:translateX(-50%);
  background:linear-gradient(135deg, #E8631A, #C4501A);
  color:#fff; white-space:nowrap;
  font-size:36px; font-weight:800;
  padding:14px 52px; border-radius:60px;
  box-shadow:0 4px 20px rgba(0,0,0,0.35);
}

/* ② 이미지 창 위 — 키워드 강조 (이미지 중앙) */
.keyword-area {
  position:absolute;
  top:490px; left:50%;
  transform:translateX(-50%);
  width:980px; text-align:center;
}
.keyword-text {
  font-size:92px; font-weight:900;
  color:${kwColor};
  line-height:1.20; word-break:keep-all;
  text-shadow:0 4px 12px rgba(0,0,0,0.95), 0 8px 40px rgba(0,0,0,0.85);
  letter-spacing:-2px;
}
.keyword-text.hook-kw {
  font-size:100px;
  text-shadow:0 4px 10px rgba(0,0,0,1),
    -3px 0 0 rgba(232,99,26,0.55), 3px 0 0 rgba(232,99,26,0.55);
}

/* ③ 하단 흰색 자막 바 (y=1080~1680) */
.caption-bar {
  position:absolute;
  top:1080px; left:0; right:0; height:600px;
  background:#ffffff;
  border-top:5px solid rgba(232,99,26,0.4);
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:32px 56px; gap:18px;
}
.caption-text {
  font-size:56px; font-weight:900; color:#111111;
  line-height:1.55; word-break:keep-all;
  text-align:center; letter-spacing:-0.5px;
}
.caption-url {
  font-size:28px; font-weight:700; color:#E8631A;
}

/* ④ 진행 바 (y=1700) */
.progress-track {
  position:absolute;
  top:1700px; left:0; right:0; height:14px;
  background:rgba(0,0,0,0.08);
}
.progress-fill {
  height:100%; width:${progress}%;
  background:${progressColor};
  border-radius:0 7px 7px 0;
}
</style>
</head>
<body>

<!-- ① 상단 흰색 바 -->
<div class="top-bar">
  <div class="brand-inner">
    <span class="brand-icon">💪</span>
    <span class="brand-text">다이어트·운동 백과</span>
  </div>
</div>

<!-- ② 이미지 창 위 요소 -->
${isHook ? '<div class="hook-badge">✅ 지금 바로 알아보세요</div>' : ''}
${keyword ? `<div class="keyword-area"><div class="keyword-text${isHook ? ' hook-kw' : ''}">${keyword}</div></div>` : ''}

<!-- ③ 하단 흰색 자막 바 -->
<div class="caption-bar">
  <div class="caption-text">${narration.replace(/\n/g, '<br>')}</div>
  <div class="caption-url">다이어트·운동 백과</div>
</div>

<!-- ④ 진행 바 -->
<div class="progress-track">
  <div class="progress-fill"></div>
</div>

</body>
</html>`;
}

// ─── 5-a. 썸네일 HTML ────────────────────────────────────────────────────────
function makeThumbnailHtml(youtubeTitle, keyword) {
  const kwFontSize = keyword.length > 8 ? 84 : 100;
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
.top-bar {
  position:absolute; top:0; left:0; right:0; height:200px;
  background:#ffffff;
  border-bottom:5px solid rgba(232,99,26,0.3);
  display:flex; align-items:center; justify-content:center; gap:18px;
}
.brand-icon { font-size:56px; line-height:1; }
.brand-text  { font-size:50px; font-weight:900; color:#E8631A; letter-spacing:0.5px; }
.keyword-wrap {
  position:absolute; top:260px; left:60px; right:60px;
  display:flex; flex-direction:column; align-items:center; gap:28px;
}
.topic-badge {
  background:linear-gradient(135deg,#E8631A,#C4501A);
  color:#fff; font-size:38px; font-weight:800;
  padding:18px 56px; border-radius:60px; letter-spacing:0.5px;
  box-shadow:0 6px 24px rgba(0,0,0,0.35);
}
.keyword-text {
  font-size:${kwFontSize}px; font-weight:900;
  color:#FFD700; line-height:1.2;
  word-break:keep-all; text-align:center;
  text-shadow:
    0 4px 8px rgba(0,0,0,0.95), 0 8px 40px rgba(0,0,0,0.85),
    -3px -3px 0 rgba(0,0,0,0.7), 3px -3px 0 rgba(0,0,0,0.7),
    -3px  3px 0 rgba(0,0,0,0.7), 3px  3px 0 rgba(0,0,0,0.7);
  letter-spacing:-1px;
}
.title-bar {
  position:absolute; bottom:240px; left:0; right:0;
  background:#ffffff; padding:44px 64px 36px;
  border-top:6px solid #E8631A;
}
.title-text {
  font-size:58px; font-weight:900; color:#2D1A0E;
  line-height:1.35; word-break:keep-all; text-align:center;
  letter-spacing:-0.5px;
}
.site-url {
  font-size:30px; font-weight:700; color:#E8631A;
  text-align:center; margin-top:18px; opacity:0.85;
}
.bottom-pad {
  position:absolute; bottom:0; left:0; right:0; height:240px;
  background:#ffffff;
  border-top:2px solid rgba(232,99,26,0.15);
}
</style>
</head>
<body>
<div class="top-bar">
  <span class="brand-icon">💪</span>
  <span class="brand-text">다이어트·운동 백과</span>
</div>
<div class="keyword-wrap">
  <div class="topic-badge">🎯 오늘의 다이어트 정보</div>
  <div class="keyword-text">${keyword}</div>
</div>
<div class="title-bar">
  <div class="title-text">${youtubeTitle}</div>
  <div class="site-url">다이어트·운동 백과</div>
</div>
<div class="bottom-pad"></div>
</body>
</html>`;
}

// ─── 5-b. 배경 이미지 + 썸네일 오버레이 합성 → JPEG ─────────────────────────
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

// (이하 구 HTML 함수들은 아래에 있던 것들 — 아래 주석줄부터 교체)
// ─── 구 인트로 슬라이드 함수 (하위 호환용 더미) ──────────────────────────────
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

// ─── 6. 슬라이드 클립 합성 (이미지 + 오버레이 + 오디오) ─────────────────────
function createSlideClip(imagePath, overlayPath, audioPath, duration, outPath) {
  return new Promise((resolve, reject) => {
    const d = (duration + 0.3).toFixed(2);
    ffmpeg()
      .input(imagePath).inputOptions(['-loop', '1', '-framerate', '25'])
      .input(audioPath)
      .input(overlayPath)
      .complexFilter([
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,` +
        `crop=${W}:${H},setsar=1[bg]`,
        `[bg][2:v]overlay=0:0:eof_action=repeat,` +
        `fade=t=in:st=0:d=0.2,` +
        `fade=t=out:st=${(parseFloat(d) - 0.3).toFixed(2)}:d=0.3[out]`,
      ])
      .outputOptions([
        '-map', '[out]',
        '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k',
        '-pix_fmt', 'yuv420p',
        '-t', d,
        '-movflags', '+faststart',
        '-af', `afade=t=in:st=0:d=0.15,afade=t=out:st=${(duration - 0.2).toFixed(2)}:d=0.2`,
      ])
      .output(outPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
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

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== 다이어트·운동 쇼츠 v11 (바이럴 5슬라이드, 25~35초) ===\n');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shorts-'));

  // GitHub Actions: 시스템 Chrome 우선 사용, 없으면 Puppeteer 번들 Chrome 사용
  const executablePath = (() => {
    const candidates = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return undefined; // Puppeteer 번들 Chrome 자동 사용
  })();
  if (executablePath) console.log(`  Chrome 경로: ${executablePath}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  try {
    const postId = getArg('post-id');
    const post = await withRetry(() =>
      postId
        ? prisma.post.findUnique({ where: { id: parseInt(postId) }, include: { category: true } })
        : prisma.post.findFirst({
            where: { status: 'PUBLISHED', shortsGenerated: false },
            orderBy: { publishedAt: 'desc' },
            include: { category: true },
          }).then(r => r || prisma.post.findFirst({
            where: { status: 'PUBLISHED' },
            orderBy: { publishedAt: 'desc' },
            include: { category: true },
          }))
    );

    if (!post) { console.log('쇼츠를 만들 글이 없습니다.'); return; }
    console.log(`대상 글: "${post.title}"\n`);

    // 1. GPT 스크립트
    console.log('[1/3] 쇼츠 스크립트 생성...');
    const script = await generateShortsScript(post);
    const slides = (script.slides || []).slice(0, 5);
    console.log(`  제목: ${script.youtubeTitle}`);
    console.log(`  구조: ${script.scriptType || '미지정'} | 슬라이드: ${slides.length}개`);
    slides.forEach((s, i) => console.log(`    ${i + 1}. [${s.type}] 키워드:"${s.keyword}" | ${s.narration.replace(/\n/g, ' / ').slice(0, 30)}...`));
    console.log('');

    // 2. 슬라이드별 처리
    console.log('[2/3] 클립 생성...\n');
    const clipPaths = [];
    let totalDuration = 0;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      console.log(`  ── 슬라이드 ${i + 1}/${slides.length} ──`);

      // a) 이미지
      const imagePath = path.join(tmpDir, `image_${i}.jpg`);
      try {
        console.log(`     🖼️  "${slide.imageQuery}"`);
        await fetchPexelsPhoto(slide.imageQuery, imagePath);
      } catch {
        console.log(`     ⚠️ 재시도: "fit woman fitness workout bright"`);
        await fetchPexelsPhoto('fit woman fitness workout bright', imagePath);
      }

      // b) TTS - narration 그대로 읽기
      const audioPath = path.join(tmpDir, `audio_${i}.mp3`);
      await generateAudio(slide.narration, audioPath);
      const duration = await getAudioDuration(audioPath);

      // 총 58초 초과 시 슬라이드 건너뜀 (YouTube Shorts 60초 제한)
      if (totalDuration + duration + 0.3 > 58) {
        console.log(`     ⚠️ 58초 초과 예상 → 슬라이드 ${i + 1} 건너뜀`);
        break;
      }

      totalDuration += duration + 0.3;
      console.log(`     🔊 ${slide.narration.length}자 → ${duration.toFixed(1)}초`);

      // c) 오버레이 - 키워드 강조 + 나레이션 분리 표시
      const overlayPath = path.join(tmpDir, `overlay_${i}.png`);
      const html = makeOverlayHtml(slide.narration, i + 1, slides.length, slide.keyword || '', slide.type || 'body');
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: overlayPath, omitBackground: true });

      // d) 클립 합성
      const clipPath = path.join(tmpDir, `clip_${String(i).padStart(2, '0')}.mp4`);
      await createSlideClip(imagePath, overlayPath, audioPath, duration, clipPath);
      clipPaths.push(clipPath);
      console.log(`     ✅ 완료\n`);
    }

    // 썸네일 오버레이 PNG — 브라우저 닫기 전에 생성
    const thumbOverlayPath = path.join(tmpDir, 'thumb_overlay.png');
    try {
      const thumbHtml = makeThumbnailHtml(script.youtubeTitle, slides[0]?.keyword || '');
      await page.setContent(thumbHtml, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: thumbOverlayPath, omitBackground: true });
      console.log('  📸 썸네일 오버레이 생성 완료\n');
    } catch (e) {
      console.log(`  ⚠️ 썸네일 오버레이 생성 실패: ${e.message}\n`);
    }

    await browser.close();
    browser._closed = true;
    console.log(`총 ${slides.length}슬라이드 | 예상 길이: ~${totalDuration.toFixed(0)}초\n`);

    // 3. 최종 합성
    console.log('[3/3] 최종 영상 합성...');
    const finalPath = path.join(tmpDir, 'shorts_final.mp4');
    await concatClips(clipPaths, finalPath);
    const sizeMB = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
    console.log(`  완성: ${sizeMB}MB\n`);

    // 4. 업로드 또는 저장
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fitnessdic.co.kr';
    const postUrl = `${siteUrl}/${post.category.slug}/${post.slug}`;
    const fullDesc =
      `📖 전체 내용 블로그에서 보기 👇\n` +
      `${postUrl}\n\n` +
      `${script.description}\n\n` +
      `이 영상이 도움이 됐다면 구독 & 좋아요 눌러주세요! 💪\n` +
      `매일 새로운 다이어트·운동 정보를 쇼츠로 전해드립니다.\n\n` +
      `─────────────────────\n` +
      `${(script.tags || []).map((t) => '#' + t.replace(/\s/g, '')).join(' ')} #Shorts #다이어트 #운동 #피트니스`;

    if (process.env.YOUTUBE_REFRESH_TOKEN) {
      console.log('[4/4] YouTube 업로드 시작...');
      const { uploadToYouTube, uploadThumbnail, postComment } = require('./youtube-uploader');
      let videoId;
      try {
        videoId = await uploadToYouTube({
          videoPath: finalPath,
          title: script.youtubeTitle,
          description: fullDesc,
          tags: [...(script.tags || []), '다이어트', '운동', '피트니스', 'Shorts'],
          categoryId: '26',
        });
      } catch (uploadErr) {
        console.error(`\n❌ YouTube 업로드 실패: ${uploadErr.message}`);
        if (uploadErr.message.includes('invalid_grant') || uploadErr.message.includes('Token')) {
          console.error('⚠️  YOUTUBE_REFRESH_TOKEN이 만료됐을 가능성이 높습니다.');
          console.error('   get-refresh-token.js 로 토큰을 재발급하고 GitHub Secrets를 업데이트하세요.');
        }
        console.error(uploadErr.stack || '');
        throw uploadErr;
      }

      // 타이틀 카드 썸네일 업로드
      try {
        const thumbJpgPath = path.join(tmpDir, 'thumbnail.jpg');
        const firstImagePath = path.join(tmpDir, 'image_0.jpg');
        console.log('  썸네일 합성 중...');
        await compositeThumbnail(firstImagePath, thumbOverlayPath, thumbJpgPath);
        await uploadThumbnail({ videoId, thumbnailPath: thumbJpgPath });
        console.log('  썸네일 업로드 완료 ✅');
      } catch (thumbErr) {
        console.log(`  썸네일 업로드 실패 (건너뜀): ${thumbErr.message}`);
      }

      // 댓글로 블로그 링크 게시
      try {
        await postComment({
          videoId,
          text: `📖 영상에서 다 못 담은 내용, 블로그에서 확인하세요 👇\n${postUrl}`,
        });
        console.log('  블로그 링크 댓글 게시 완료 ✅');
      } catch (commentErr) {
        console.log(`  댓글 게시 건너뜀: ${commentErr.message}`);
      }

      await prisma.post.update({
        where: { id: post.id },
        data: { shortsGenerated: true, shortsVideoId: videoId },
      });
      console.log(`✅ 업로드 완료! https://youtube.com/shorts/${videoId}`);
    } else {
      console.log('⚠️  YOUTUBE_REFRESH_TOKEN 없음 — 로컬 파일로 저장합니다.');
      const outDir = path.join(process.cwd(), 'shorts-output');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
      const savePath = path.join(outDir, `${post.slug}.mp4`);
      fs.copyFileSync(finalPath, savePath);
      await prisma.post.update({ where: { id: post.id }, data: { shortsGenerated: true } });
      console.log(`✅ 저장: ${savePath}`);
    }

  } catch (e) {
    console.error('\n오류:', e.message);
    if (process.env.DEBUG) console.error(e.stack);
  } finally {
    if (!browser._closed) await browser.close().catch(() => {});
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

main();
