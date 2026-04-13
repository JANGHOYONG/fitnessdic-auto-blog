/**
 * 구글 TTS 한국어 목소리 전체 비교 샘플
 * 실행: node scripts/tts-voice-compare.js
 *
 * 등급별 무료 한도:
 *   Standard : 월 400만 자 무료
 *   WaveNet  : 월 100만 자 무료
 *   Neural2  : 월 100만 자 무료
 *   Studio   : 유료 (제외)
 */
require('dotenv').config({ path: '.env' });
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');
const { execSync } = require('child_process');

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
const OUT_DIR = path.join(__dirname, '..', 'tts-samples', 'voices');

const SAMPLE_TEXT = '안녕하세요! 오늘 알려드릴 다이어트 꿀팁 5가지, 지금 바로 시작합니다!';
const RATE = 1.2;

// ── 비교할 목소리 목록 ──────────────────────────────────────────────────────
const VOICES = [
  // Standard (가장 기계적, 무료 400만자)
  { name: 'ko-KR-Standard-A', grade: 'Standard', gender: '여성', note: '기본형' },
  { name: 'ko-KR-Standard-B', grade: 'Standard', gender: '여성', note: '기본형2' },
  { name: 'ko-KR-Standard-C', grade: 'Standard', gender: '남성', note: '현재 사용중' },
  { name: 'ko-KR-Standard-D', grade: 'Standard', gender: '남성', note: '기본형4' },

  // WaveNet (자연스러움↑, 무료 100만자)
  { name: 'ko-KR-Wavenet-A', grade: 'WaveNet', gender: '여성', note: '인기 ⭐' },
  { name: 'ko-KR-Wavenet-B', grade: 'WaveNet', gender: '여성', note: '인기 ⭐' },
  { name: 'ko-KR-Wavenet-C', grade: 'WaveNet', gender: '남성', note: '인기 ⭐⭐' },
  { name: 'ko-KR-Wavenet-D', grade: 'WaveNet', gender: '남성', note: '' },

  // Neural2 (가장 자연스러움, 무료 100만자)
  { name: 'ko-KR-Neural2-A', grade: 'Neural2', gender: '여성', note: '최고품질 ⭐⭐⭐' },
  { name: 'ko-KR-Neural2-B', grade: 'Neural2', gender: '여성', note: '최고품질 ⭐⭐⭐' },
  { name: 'ko-KR-Neural2-C', grade: 'Neural2', gender: '남성', note: '최고품질 ⭐⭐⭐' },
];

async function synthesize(text, voiceName, rate, outPath) {
  const res = await axios.post(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
    {
      input: { text },
      voice: { languageCode: 'ko-KR', name: voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
    }
  );
  fs.writeFileSync(outPath, Buffer.from(res.data.audioContent, 'base64'));
}

async function main() {
  if (!API_KEY) { console.error('❌ GOOGLE_TTS_API_KEY 없음'); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`🎙️  한국어 TTS 목소리 비교 샘플 생성 (속도: ${RATE}x)\n`);
  console.log(`샘플 텍스트: "${SAMPLE_TEXT}"\n`);
  console.log('─'.repeat(60));

  let lastGrade = '';
  for (const v of VOICES) {
    if (v.grade !== lastGrade) {
      console.log(`\n【 ${v.grade} 】`);
      lastGrade = v.grade;
    }

    const fileName = `${v.name}.mp3`;
    const outPath  = path.join(OUT_DIR, fileName);

    process.stdout.write(`  ${v.gender} ${v.name} ${v.note ? `(${v.note})` : ''} ... `);
    try {
      await synthesize(SAMPLE_TEXT, v.name, RATE, outPath);
      const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
      console.log(`✅ ${kb}KB`);
    } catch (e) {
      console.log(`❌ ${e.response?.data?.error?.message || e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n▶️  순서대로 들으려면 아래 명령어 실행:\n');
  console.log(`node -e "
const {execSync}=require('child_process');
const voices=${JSON.stringify(VOICES.map(v=>v.name))};
for(const v of voices){
  console.log('▶ ' + v);
  try{execSync('afplay \\"${OUT_DIR}/' + v + '.mp3\\"');}catch(e){}
}
"`);

  console.log('\n또는 Finder에서 열기:');
  console.log(`open "${OUT_DIR}"`);
}

main().catch(console.error);
