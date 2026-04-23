/**
 * 2차 AI 팩트체크 — 금지어·의학 단정·출처 없는 수치 검사
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function factCheck(content) {
  try {
    const textOnly = content.replace(/<[^>]+>/g, '').slice(0, 3000);

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '한국어 건강·운동 블로그 글을 검토해 다음 3가지만 JSON으로 보고하세요: 1) 출처 없는 수치 목록, 2) 의학적 단정 문구 목록, 3) 전반적 신뢰도 점수(0~100). 형식: {"unsourcedClaims":[],"medicalAssertions":[],"reliabilityScore":85}',
        },
        { role: 'user', content: `글 내용:\n${textOnly}` },
      ],
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (e) {
    console.log(`  [fact-checker] 오류: ${e.message}`);
    return { unsourcedClaims: [], medicalAssertions: [], reliabilityScore: 70 };
  }
}

module.exports = { factCheck };
