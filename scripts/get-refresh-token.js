/**
 * YouTube OAuth2 Refresh Token 발급 스크립트
 * 실행: node scripts/get-refresh-token.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const REDIRECT_URI = 'http://localhost:3001';

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ],
});

console.log('\n🔗 아래 URL을 브라우저에서 열어주세요:\n');
console.log(authUrl);
console.log('\n⏳ 인증 완료를 기다리는 중...\n');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;

  if (!code) {
    res.writeHead(400);
    res.end('코드가 없습니다.');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h2>✅ 인증 완료! 터미널을 확인하세요.</h2>');

  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Refresh Token 발급 성공!\n');
    console.log('아래 값을 GitHub Secrets에 업데이트하세요:');
    console.log('─────────────────────────────────────');
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('─────────────────────────────────────\n');
  } catch (e) {
    console.error('❌ 오류:', e.message);
  }
});

server.listen(3001, () => {
  console.log('로컬 서버 시작 (port 3001)');
});
