/**
 * YouTube 채널 아트 생성 - 다이어트·운동 백과
 * 실행: node scripts/make-channel-art.js
 * 출력:
 *   channel-profile.png  (800×800  — 프로필 사진)
 *   channel-banner.png   (2560×1440 — 채널 배너)
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');

// ── 프로필 이미지 HTML (800×800) ────────────────────────────────────────────
const profileHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:800px; height:800px; overflow:hidden; }
.wrap {
  width:800px; height:800px;
  background: linear-gradient(145deg, #7A2E0E 0%, #C4501A 55%, #E8631A 100%);
  display:flex; flex-direction:column;
  justify-content:center; align-items:center;
  font-family:'Noto Sans CJK KR','Apple SD Gothic Neo','맑은 고딕',sans-serif;
  border-radius:400px;
  position:relative; overflow:hidden;
}
.wrap::before {
  content:'';
  position:absolute;
  width:600px; height:600px; border-radius:50%;
  background:rgba(255,255,255,0.07);
  top:-130px; right:-130px;
}
.wrap::after {
  content:'';
  position:absolute;
  width:380px; height:380px; border-radius:50%;
  background:rgba(255,255,255,0.05);
  bottom:-90px; left:-70px;
}
.icon { font-size:200px; line-height:1; margin-bottom:8px; position:relative; z-index:1; }
.main {
  font-size:96px; font-weight:900; color:#fff;
  letter-spacing:-2px; line-height:1.1; text-align:center;
  text-shadow: 0 4px 20px rgba(0,0,0,0.35);
  position:relative; z-index:1;
}
.sub {
  font-size:38px; font-weight:600;
  color:rgba(255,255,255,0.75);
  margin-top:14px; letter-spacing:5px;
  position:relative; z-index:1;
}
</style>
</head>
<body>
<div class="wrap">
  <div class="icon">💪</div>
  <div class="main">다이어트<br>운동백과</div>
  <div class="sub">Fitness &amp; Diet</div>
</div>
</body>
</html>`;

// ── 채널 배너 HTML (2560×1440) ───────────────────────────────────────────────
const bannerHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:2560px; height:1440px; overflow:hidden; }
.wrap {
  width:2560px; height:1440px;
  background: linear-gradient(135deg, #3D1205 0%, #7A2E0E 30%, #C4501A 65%, #E8631A 100%);
  display:flex; align-items:center; justify-content:center;
  font-family:'Noto Sans CJK KR','Apple SD Gothic Neo','맑은 고딕',sans-serif;
  position:relative; overflow:hidden;
}

/* 배경 장식 */
.circle1 {
  position:absolute;
  width:900px; height:900px; border-radius:50%;
  background:rgba(255,255,255,0.05);
  top:-200px; right:200px;
}
.circle2 {
  position:absolute;
  width:600px; height:600px; border-radius:50%;
  background:rgba(255,255,255,0.04);
  bottom:-150px; left:300px;
}
.circle3 {
  position:absolute;
  width:300px; height:300px; border-radius:50%;
  background:rgba(255,255,255,0.06);
  top:200px; left:100px;
}
/* 오른쪽 밝은 영역 (TV/모니터 safe zone) */
.right-glow {
  position:absolute;
  width:800px; height:1440px;
  right:0; top:0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04));
}

/* 안전 영역 컨텐츠 (가운데 1546px 이내) */
.content {
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  text-align:center;
  position:relative; z-index:10;
  width:1546px;
}

.icon { font-size:220px; line-height:1; margin-bottom:20px; }

.title {
  font-size:180px; font-weight:900; color:#fff;
  letter-spacing:-4px; line-height:1.05;
  text-shadow: 0 6px 30px rgba(0,0,0,0.4);
}

.divider {
  width:200px; height:6px;
  background: rgba(255,255,255,0.5);
  border-radius:3px;
  margin:36px auto;
}

.subtitle {
  font-size:72px; font-weight:700;
  color:rgba(255,255,255,0.85);
  letter-spacing:2px; line-height:1.4;
}

.tags {
  display:flex; gap:28px;
  margin-top:48px; flex-wrap:wrap;
  justify-content:center;
}
.tag {
  background:rgba(255,255,255,0.15);
  border:2px solid rgba(255,255,255,0.3);
  border-radius:60px;
  padding:16px 44px;
  font-size:48px; font-weight:600;
  color:rgba(255,255,255,0.9);
  letter-spacing:1px;
  backdrop-filter:blur(10px);
}

.schedule {
  margin-top:56px;
  font-size:44px; font-weight:500;
  color:rgba(255,255,255,0.6);
  letter-spacing:2px;
}
</style>
</head>
<body>
<div class="wrap">
  <div class="circle1"></div>
  <div class="circle2"></div>
  <div class="circle3"></div>
  <div class="right-glow"></div>

  <div class="content">
    <div class="icon">💪</div>
    <div class="title">다이어트·운동 백과</div>
    <div class="divider"></div>
    <div class="subtitle">30·40·50대를 위한 과학적 다이어트·운동 가이드</div>
    <div class="tags">
      <div class="tag"># 체중감량</div>
      <div class="tag"># 근력운동</div>
      <div class="tag"># 홈트레이닝</div>
      <div class="tag"># 식단·영양</div>
      <div class="tag"># 바디프로필</div>
    </div>
    <div class="schedule">📅 매일 새로운 운동·다이어트 정보 업로드</div>
  </div>
</div>
</body>
</html>`;

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // ── 1. 프로필 이미지 생성 (800×800) ──────────────────────────────────────
    console.log('🖼️  프로필 이미지 생성 중...');
    const profilePage = await browser.newPage();
    await profilePage.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 });
    await profilePage.setContent(profileHtml, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 800));
    const profilePath = path.join(process.cwd(), 'channel-profile.png');
    await profilePage.screenshot({ path: profilePath, type: 'png', clip: { x: 0, y: 0, width: 800, height: 800 } });
    await profilePage.close();
    console.log(`✅ 프로필 이미지: ${profilePath}`);

    // ── 2. 채널 배너 생성 (2560×1440) ────────────────────────────────────────
    console.log('\n🎨 채널 배너 생성 중...');
    const bannerPage = await browser.newPage();
    await bannerPage.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 1 });
    await bannerPage.setContent(bannerHtml, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 800));
    const bannerPath = path.join(process.cwd(), 'channel-banner.png');
    await bannerPage.screenshot({ path: bannerPath, type: 'png', clip: { x: 0, y: 0, width: 2560, height: 1440 } });
    await bannerPage.close();
    console.log(`✅ 채널 배너: ${bannerPath}`);

  } finally {
    await browser.close();
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 채널 아트 생성 완료!

📁 생성된 파일:
  - channel-profile.png  (프로필 사진용 — 800×800)
  - channel-banner.png   (채널 배너용 — 2560×1440)

📋 유튜브 채널 설정 정보:
  이름: 다이어트·운동 백과
  핸들: @fitnessdic
  설명: (아래 참고)

📝 채널 설명:
  💪 30·40·50대를 위한 과학적 다이어트·운동 채널

  국가공인 생활스포츠지도사 & 스포츠영양사가 알려주는
  체중감량 · 근력운동 · 홈트레이닝 · 식단 · 바디프로필 정보

  ✅ 매일 운동·다이어트 쇼츠 업로드
  ✅ 과학적 근거 기반 정보만 제공
  ✅ 바쁜 직장인도 따라할 수 있는 현실적인 방법

  🌐 블로그: https://smartinfohealth.co.kr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(console.error);
