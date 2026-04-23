/**
 * 품질 게이트 — 7대 기준 검사
 * runQualityGate(post) → { pass, score, reasons }
 */

const MIN_CHARS = 2200;
const MIN_SOURCES = 2;  // source-fetcher 검증 URL 수 (실제 HEAD 체크 후)
const MIN_FAQS = 2;
const MIN_INTERNAL_LINKS = 0; // 초기엔 0 (글이 충분히 쌓이면 높임)

const FORBIDDEN_PHRASES = [
  '치료한다', '낫게 한다', '기적의', '무조건', '확실히 효과',
  '의사들도 몰랐던', '충격', '반드시 효과',
];

function plainTextLength(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
}

function runQualityGate(post) {
  const reasons = [];

  // 1) 본문 길이
  const charLen = post.content ? plainTextLength(post.content) : 0;
  if (charLen < MIN_CHARS) {
    reasons.push(`본문 짧음 (${charLen}자, 기준 ${MIN_CHARS}자)`);
  }

  // 2) 이미지 최소 1장 (thumbnail 포함)
  const imgCount = post.thumbnail ? 1 : 0 +
    (post.content ? (post.content.match(/<img/g) || []).length : 0);
  if (imgCount < 1) {
    reasons.push('이미지 없음 (최소 1장 필요)');
  }

  // 3) FAQ 여부
  const hasFaq = post.content && (
    post.content.includes('faq-item') ||
    post.content.includes('자주 묻는') ||
    post.content.includes('Q.') ||
    post.content.includes('FAQ')
  );
  if (!hasFaq) {
    reasons.push('FAQ 섹션 없음');
  }

  // 4) 금지어 검사
  const body = post.content || '';
  const hits = FORBIDDEN_PHRASES.filter((w) => body.includes(w));
  if (hits.length) {
    reasons.push(`금지어 포함: ${hits.join(', ')}`);
  }

  // 5) 쿠팡 링크 정상 여부 (있을 경우)
  // coupangProduct 필드는 JSON 문자열이므로 파싱만 체크
  if (post.coupangProduct) {
    try {
      const p = JSON.parse(post.coupangProduct);
      if (!p.url) reasons.push('쿠팡 상품 URL 누락');
    } catch {
      reasons.push('쿠팡 상품 JSON 파싱 오류');
    }
  }

  // 점수 산정 (100점 기준)
  const score = Math.max(0, 100 - reasons.length * 15);

  return {
    pass: reasons.length === 0,
    score,
    reasons,
  };
}

module.exports = { runQualityGate, plainTextLength };
