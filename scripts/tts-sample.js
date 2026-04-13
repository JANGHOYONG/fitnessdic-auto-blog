/**
 * TTS 샘플 생성 테스트
 * 실행: node scripts/tts-sample.js
 */
require('dotenv').config({ path: '.env' });
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
const OUT_DIR = path.join(__dirname, '..', 'tts-samples');

// 샘플 텍스트 (쇼츠 스타일)
const SAMPLES = [
  {
    name: 'intro_1.2x',
    rate: 1.2,
    text: '다이어트 할 때 이것만 알면 됩니다! 체중감량 필수 5가지, 지금 바로 확인하세요.',
  },
  {
    name: 'item_1.2x',
    rate: 1.2,
    text: '첫 번째! 단백질을 충분히 섭취하세요. 근육을 지키면서 지방만 빠집니다.',
  },
  {
    name: 'outro_1.2x',
    rate: 1.2,
    text: '저장하고 나중에 다시 보세요! 구독하면 매일 유용한 정보를 받을 수 있어요.',
  },
  // 비교용: 기존 0.9배속
  {
    name: 'intro_0.9x_기존',
    rate: 0.90,
    text: '다이어트 할 때 이것만 알면 됩니다! 체중감량 필수 5가지, 지금 바로 확인하세요.',
  },
];

async function synthesize(text, rate, outPath) {
  const res = await axios.post(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
    {
      input: { text },
      voice: { languageCode: 'ko-KR', name: 'ko-KR-Standard-C' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
    }
  );
  fs.writeFileSync(outPath, Buffer.from(res.data.audioContent, 'base64'));
}

async function main() {
  if (!API_KEY) { console.error('❌ GOOGLE_TTS_API_KEY 없음'); process.exit(1); }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('🎙️  TTS 샘플 생성 중...\n');
  for (const s of SAMPLES) {
    const outPath = path.join(OUT_DIR, `${s.name}.mp3`);
    process.stdout.write(`  [${s.rate}x] ${s.name} ... `);
    await synthesize(s.text, s.rate, outPath);
    const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`✅ ${kb}KB → ${outPath}`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ 완료! tts-samples/ 폴더를 확인하세요.`);
  console.log(`\n▶️  재생 명령어:`);
  SAMPLES.forEach(s => {
    console.log(`   afplay "${OUT_DIR}/${s.name}.mp3"`);
  });
}

main().catch(console.error);
