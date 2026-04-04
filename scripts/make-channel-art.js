/**
 * YouTube 채널 프로필 이미지 생성
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');

const SIZE = 800;

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${SIZE}px; height:${SIZE}px; overflow:hidden; }
.wrap {
  width:${SIZE}px; height:${SIZE}px;
  background: linear-gradient(135deg, #1a5276 0%, #1abc9c 100%);
  display:flex; flex-direction:column;
  justify-content:center; align-items:center;
  font-family:'Noto Sans KR',sans-serif;
  border-radius:${SIZE/2}px;
}
.icon { font-size:200px; line-height:1; margin-bottom:20px; }
.main { font-size:110px; font-weight:900; color:#fff;
  letter-spacing:-2px; line-height:1.1; text-align:center;
  text-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.sub { font-size:60px; font-weight:700; color:rgba(255,255,255,0.85);
  margin-top:12px; letter-spacing:6px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="icon">🏥</div>
  <div class="main">건강<br>주치의</div>
  <div class="sub">5060</div>
</div>
</body>
</html>`;

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 500));

  const outPath = path.join(process.cwd(), 'channel-profile.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();

  console.log(`✅ 프로필 이미지 생성 완료: ${outPath}`);
}

main().catch(console.error);
