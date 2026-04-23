/**
 * 출처 후보 수집 + HEAD 검증
 * fetchSourceCandidates(topic) → verified sources array
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchSourceCandidates(topic) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '주제에 대한 한국 공공기관·학회의 1차 출처 후보 5건을 JSON으로 반환하세요. 임의 URL 생성 금지. 확실하지 않은 URL은 url 필드를 null로 설정.',
        },
        {
          role: 'user',
          content: `주제: ${topic}\n\n출력 형식: { "sources": [{"title":"...","url":"https://...또는null","publisher":"기관명"}] }`,
        },
      ],
    });

    const raw = JSON.parse(res.choices[0].message.content);
    const candidates = raw.sources || [];

    // HEAD 체크로 실제 접속 가능 URL만 필터
    const verified = [];
    for (const s of candidates) {
      if (!s.url) {
        // URL 없어도 기관 출처는 인용 가능
        verified.push({ ...s, verified: false, accessedAt: new Date().toISOString() });
        continue;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(s.url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (r.ok || r.status === 405) {
          verified.push({ ...s, verified: true, accessedAt: new Date().toISOString() });
        }
      } catch {
        // 접속 불가 — 제목만 보존
        verified.push({ ...s, url: null, verified: false, accessedAt: new Date().toISOString() });
      }
    }

    return verified;
  } catch (e) {
    console.log(`  [source-fetcher] 오류: ${e.message}`);
    return [];
  }
}

module.exports = { fetchSourceCandidates };
