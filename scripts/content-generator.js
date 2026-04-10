/**
 * 콘텐츠 자동 생성 스크립트 (GPT-4o-mini + Unsplash 이미지)
 * 실행: node scripts/content-generator.js
 * 옵션: --count=3 --category=tech
 */

require('dotenv').config();
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const args = process.argv.slice(2);
const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
};
const generateCount = parseInt(getArg('count') || process.env.DAILY_POST_LIMIT || '3');
const targetCategory = getArg('category');

// ─── 쿠팡파트너스 구글 시트 연동 ─────────────────────────────────────────────
const COUPANG_SHEET_ID = '1f_yqf9AaNx8MF0dYRqE6LleTf37iiLexRbvtELPJ7pk';

// 단일 시트명 — 카테고리 구분 없이 전체 상품 사용
const COUPANG_SHEET_NAME = '시트1';

// 구글 시트에서 전체 상품 목록 읽기 (CSV 파싱) — 카테고리 무관 랜덤 선택
async function fetchCoupangProducts(topicId) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${COUPANG_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(COUPANG_SHEET_NAME)}`;
    console.log(`    [쿠팡] 시트 로딩: "${COUPANG_SHEET_NAME}" (${url.slice(0, 80)}...)`);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`    [쿠팡] HTTP 오류: ${res.status}`);
      return [];
    }
    const csv = await res.text();
    const lines = csv.trim().split('\n').slice(1); // 헤더 제거
    const products = lines
      .map((line) => {
        // CSV 파싱: "상품명","URL","이미지URL(선택)","가격(선택)"
        const cols = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
        const clean = (v) => (v || '').replace(/^"|"$/g, '').trim();
        const name  = clean(cols[0]);
        const url   = clean(cols[1]);
        const image = clean(cols[2]);
        const rawPrice = clean(cols[3]);
        const price = rawPrice
          ? rawPrice.replace(/₩/g, '').replace(/원$/, '').trim().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'
          : null;
        return name && url ? { name, url, image: image || null, price: price || null } : null;
      })
      .filter(Boolean);
    console.log(`    [쿠팡] ${products.length}개 상품 로딩 완료 (랜덤 선택)`);
    return products;
  } catch (e) {
    console.log(`    [쿠팡] fetch 오류: ${e.message}`);
    return [];
  }
}

// 쿠팡 배너 HTML 생성 — 인라인 스타일 (CSS 클래스 의존 제거)
function makeCoupangHtml(product, topicId) {
  const ctaText = '다이어트·운동 추천 제품';
  return `
<div style="margin:2rem 0;">
  <a href="${product.url}" target="_blank" rel="noopener sponsored" style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;padding:1rem 1.25rem;border-radius:16px;background:linear-gradient(90deg,#FF6B35 0%,#FF8A38 100%);box-shadow:0 3px 12px rgba(255,107,53,0.22);">
    <span style="color:#ffffff;font-size:1.1875rem;font-weight:700;line-height:1.3;">🛒 ${ctaText}</span>
    <span style="background:#ffffff;color:#FF6B35;padding:0.5rem 1rem;border-radius:12px;font-weight:700;font-size:0.875rem;white-space:nowrap;margin-left:0.75rem;flex-shrink:0;">쿠팡에서 보기 →</span>
  </a>
  <p style="font-size:0.75rem;margin-top:0.5rem;margin-bottom:0;color:#AAAAAA;line-height:1.6;">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
</div>`;
}

// 삽입 위치 탐색 헬퍼 — 특정 위치 앞의 <section 찾기 (최소 위치 100 이상만 유효)
function findValidSectionBefore(content, idx) {
  let pos = content.lastIndexOf('<section', idx);
  while (pos !== -1 && pos < 100) {
    pos = content.lastIndexOf('<section', pos - 1);
  }
  return pos > 100 ? pos : -1;
}

// 본문 중간 </section> 기준으로 쿠팡 박스 삽입
function insertCoupangBox(content, product, topicId) {
  if (!product) return content;
  const box = makeCoupangHtml(product, topicId);

  // 1순위: </section> 중간 지점에 삽입
  const matches = [...content.matchAll(/<\/section>/g)];
  if (matches.length >= 3) {
    const midIdx = Math.floor(matches.length / 2);
    const pos = matches[midIdx].index + '</section>'.length;
    return content.slice(0, pos) + '\n' + box + '\n' + content.slice(pos);
  }

  // fallback: </article> 바로 앞
  if (content.includes('</article>')) {
    return content.replace('</article>', box + '\n</article>');
  }
  return content + box;
}

// ─── Unsplash 이미지 ──────────────────────────────────────────────────────────
async function fetchPexelsImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || !data.results.length) return null;
    // 상위 5개 중 랜덤 선택
    const pool = data.results.slice(0, 5);
    const photo = pool[Math.floor(Math.random() * pool.length)];
    return {
      url: photo.urls.regular,
      alt: photo.alt_description || query,
      credit: `Photo by ${photo.user.name} on Unsplash`,
      creditUrl: `${photo.user.links.html}?utm_source=fitnessdic&utm_medium=referral`,
    };
  } catch {
    return null;
  }
}

async function fetchBodyImages(keywords, count = 3) {
  const results = [];
  // 키워드가 부족하면 'senior health' 기본 쿼리로 채움
  const queries = [...keywords.slice(0, count)];
  while (queries.length < count) queries.push('senior health wellness');
  for (const q of queries) {
    const img = await fetchPexelsImage(q);
    if (img) results.push(img);
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}

function makeImgHtml(img) {
  return `
<figure style="margin:2rem 0;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(30,158,122,0.10)">
  <img src="${img.url}" alt="${img.alt}" style="width:100%;max-height:420px;object-fit:cover;display:block" loading="lazy" />
  <figcaption style="font-size:0.75rem;text-align:center;padding:0.5rem 1rem;background:#E3F4ED;color:#4B7A6A">
    <a href="${img.creditUrl}" target="_blank" rel="noopener noreferrer" style="color:#1E9E7A">${img.credit}</a>
  </figcaption>
</figure>`;
}

function injectBodyImages(content, images) {
  if (!images.length) return content;

  // 1순위: </section> 기준 2번째, 4번째, 6번째 뒤에 삽입 (3장)
  const sectionCount = (content.match(/<\/section>/g) || []).length;
  if (sectionCount >= 2) {
    let count = 0;
    let imgIdx = 0;
    return content.replace(/<\/section>/g, (match) => {
      count++;
      if ((count === 2 || count === 4 || count === 6) && imgIdx < images.length) {
        return match + makeImgHtml(images[imgIdx++]);
      }
      return match;
    });
  }

  // 2순위: </section> 없으면 </h2> 기준 2번째, 4번째, 6번째 뒤에 삽입
  const h2Count = (content.match(/<\/h2>/g) || []).length;
  if (h2Count >= 2) {
    let count = 0;
    let imgIdx = 0;
    return content.replace(/<\/h2>/g, (match) => {
      count++;
      if ((count === 2 || count === 4 || count === 6) && imgIdx < images.length) {
        return match + makeImgHtml(images[imgIdx++]);
      }
      return match;
    });
  }

  // 3순위: 글 1/3, 2/3, 끝 부분에 강제 삽입
  const third = Math.floor(content.length / 3);
  const insertPos = content.indexOf('</p>', third);
  if (insertPos !== -1 && images.length >= 1) {
    const after = insertPos + 4;
    let result = content.slice(0, after) + makeImgHtml(images[0]) + content.slice(after);
    if (images.length >= 2) {
      const twoThird = Math.floor(result.length * 0.6);
      const insertPos2 = result.indexOf('</p>', twoThird);
      if (insertPos2 !== -1) {
        result = result.slice(0, insertPos2 + 4) + makeImgHtml(images[1]) + result.slice(insertPos2 + 4);
      }
    }
    if (images.length >= 3) {
      const threeQ = Math.floor(result.length * 0.85);
      const insertPos3 = result.indexOf('</p>', threeQ);
      if (insertPos3 !== -1) {
        result = result.slice(0, insertPos3 + 4) + makeImgHtml(images[2]) + result.slice(insertPos3 + 4);
      }
    }
    return result;
  }

  return content;
}

// ─── 운동·다이어트 7대 주제 (순차 로테이션) ─────────────────────────────────
const FITNESS_TOPICS = [
  { id: 'weightloss',   label: '체중감량',        category: 'fitness',   words: ['체중감량', '살빼기', '지방연소', '다이어트', '감량', '지방', '체지방', '비만'] },
  { id: 'strength',     label: '근력운동',        category: 'fitness',   words: ['근력운동', '헬스', '웨이트', '근육', '벤치프레스', '스쿼트', '데드리프트', '근비대'] },
  { id: 'cardio',       label: '유산소·러닝',     category: 'fitness',   words: ['유산소', '러닝', '달리기', '조깅', '자전거', '수영', '걷기', '마라톤', '심폐'] },
  { id: 'nutrition',    label: '식단·영양',       category: 'fitness',   words: ['식단', '영양', '단백질', '칼로리', '탄수화물', '지방', '식이', '끼니', '영양소'] },
  { id: 'hometraining', label: '홈트레이닝',      category: 'fitness',   words: ['홈트', '홈트레이닝', '맨몸운동', '집에서', '플랭크', '버피', '푸시업'] },
  { id: 'supplement',   label: '다이어트 식품',   category: 'fitness',   words: ['단백질보충제', '다이어트식품', '영양제', '프로틴', '보충제', '헬스식품', '크레아틴'] },
  { id: 'motivation',   label: '바디프로필·동기', category: 'fitness',   words: ['바디프로필', '운동동기', '습관', '루틴', '운동일지', '몸만들기', '눈바디'] },
];

// 하위 호환성을 위한 별칭
const HEALTH_TOPICS = FITNESS_TOPICS;

// 7개 주제 ID 순서 배열
const TOPIC_ROTATION = HEALTH_TOPICS.map((t) => t.id);

function getSubTopic(keyword) {
  for (const topic of HEALTH_TOPICS) {
    if (topic.words.some((w) => keyword.includes(w))) return topic.id;
  }
  return null; // 분류 불가
}

// 다음 로테이션 주제 결정
function getNextTopic(lastTopicId) {
  if (!lastTopicId) return TOPIC_ROTATION[0];
  const idx = TOPIC_ROTATION.indexOf(lastTopicId);
  return TOPIC_ROTATION[(idx + 1) % TOPIC_ROTATION.length];
}

// ─── 슬러그 생성 ──────────────────────────────────────────────────────────────
function generateSlug(title) {
  const timestamp = Date.now();
  const simplified = title
    .replace(/[가-힣]+/g, (m) => `p${m.charCodeAt(0) % 10000}`)
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 50);
  return `${simplified}-${timestamp}`;
}

// ─── 주제별 콘텐츠 각도 (흥미 유발·반전·충격 정보 중심) ──────────────────────
const TOPIC_CONTENT_ANGLES = {
  weightloss: {
    angle: '반전형 — 살빠진다고 알려진 것들의 반전 + 다이어트 상식 뒤집기',
    forbidden: '적게 먹고 많이 움직이세요, 균형 잡힌 식단, 의지를 가지세요 같은 뻔한 조언',
    focus: [
      '저칼로리 다이어트 식품인데 오히려 살을 찌우는 의외의 식품들 (제로음료, 현미밥 등)',
      '운동 없이 식단만으로 살 뺐더니 생기는 문제 — 요요가 더 심해지는 이유',
      '간헐적 단식 효과가 없는 경우 — 오히려 역효과가 나는 체질과 상황',
      '체중은 똑같은데 지방이 줄고 근육이 느는 방법 — 체중계 숫자의 함정',
    ],
  },
  strength: {
    angle: '상식타파형 — 헬스장 상식의 반전 + 잘못된 운동법이 몸을 망가뜨리는 이유',
    forbidden: '꾸준히 하세요, 고중량으로 하세요, 프로틴 드세요 같은 뻔한 조언',
    focus: [
      '스쿼트·데드리프트를 잘못하면 무릎·허리가 망가지는 정확한 메커니즘',
      '근육 키우려고 매일 운동했더니 오히려 근육이 줄어드는 이유 — 회복의 과학',
      '단백질 하루 150g 먹어도 근육이 안 느는 이유 — 흡수량의 진실',
      '30분 운동 vs 1시간 운동 — 효과 차이가 없거나 오히려 역효과인 경우',
    ],
  },
  cardio: {
    angle: '비교형 — 유산소 운동의 진실 + 지방 연소 최적 조건의 반전',
    forbidden: '30분 이상 하세요, 조깅하세요, 꾸준히 하세요 같은 뻔한 조언',
    focus: [
      '유산소 운동이 오히려 근육을 태우고 지방은 남기는 조건 — 카디오 역설',
      '걷기 vs 달리기 — 지방 연소량은 같은데 몸이 달라지는 이유',
      '공복 유산소가 효과적이라는 주장이 연구로 반박된 이유와 최적 타이밍',
      '마라톤 선수가 뚱뚱한 이유 — 장시간 유산소가 체지방을 줄이지 못하는 경우',
    ],
  },
  nutrition: {
    angle: '충격형 — 건강 식단이라고 알려진 것들의 충격적 반전',
    forbidden: '채소 많이 드세요, 단백질 챙기세요, 탄수화물 줄이세요 같은 뻔한 조언',
    focus: [
      '닭가슴살·고구마 다이어트가 오히려 살을 찌우는 경우와 이유',
      '탄수화물을 끊었더니 생기는 몸의 변화 — 6주 후 반드시 나타나는 부작용',
      '단백질 쉐이크·보충제를 잘못 먹으면 신장에 부담이 되는 조건',
      '칼로리는 같은데 살이 다르게 찌는 이유 — 음식의 인슐린 반응 차이',
    ],
  },
  hometraining: {
    angle: '실용형 — 헬스장 없이 몸 만드는 진짜 방법 + 홈트 실패 이유',
    forbidden: '매일 하세요, 플랭크 하세요, 유튜브 따라 하세요 같은 뻔한 조언',
    focus: [
      '맨몸 운동만으로 근육을 키울 수 없다는 통념이 틀린 이유와 조건',
      '홈트레이닝 3개월 해도 몸이 안 변하는 이유 — 95%가 놓치는 핵심',
      '최소 공간·도구로 헬스장 못지않은 효과를 내는 과학적 원리',
      '부상 없이 오래 하는 홈트 루틴 — 관절을 망가뜨리는 동작 TOP5',
    ],
  },
  supplement: {
    angle: '경고형 — 다이어트 식품·보충제의 충격적 부작용 + 속설 타파',
    forbidden: '프로틴 드세요, 비타민 챙기세요 같은 뻔한 조언',
    focus: [
      '단백질 보충제 매일 먹으면 생기는 일 — 신장·간 부담의 진실',
      '다이어트 보조제(가르시니아·녹차추출물)가 효과 없다는 임상 연구들',
      '크레아틴·BCAA가 필요 없는 경우 — 돈 낭비인지 확인하는 기준',
      '헬스 보충제와 함께 먹으면 위험한 약·영양제 조합',
    ],
  },
  motivation: {
    angle: '심리형 — 운동을 지속하지 못하는 진짜 이유 + 의지력의 함정',
    forbidden: '의지를 가지세요, 목표를 세우세요, 꾸준히 하면 됩니다 같은 뻔한 조언',
    focus: [
      '3개월이 지나도 운동이 습관이 안 되는 이유 — 뇌과학으로 보는 동기 소멸',
      '바디프로필 준비 후 오히려 몸이 망가지는 경우 — 극단적 감량의 부작용',
      '헬스장 등록했다가 한 달 만에 그만두는 심리적 메커니즘과 해결책',
      '운동 유튜브 보는 것만으로 운동한 것 같은 착각 — 정보 중독의 함정',
    ],
  },
};

// ─── 카테고리별 전문가 역할 ───────────────────────────────────────────────────
const SYSTEM_ROLES = {
  fitness:   '10년 경력 국가공인 생활스포츠지도사이자 스포츠영양사. 체중감량·근력운동·유산소·식단·홈트레이닝 등 과학적 근거 기반의 다이어트·운동 정보를 30~50대 일반인이 이해하기 쉽게 전달. 섣부른 효과 보장은 하지 않으며 개인차가 있음을 항상 명시. ⚠️ 절대 금지: "열심히 하세요", "꾸준히 하세요", "균형 잡힌 식단" 같이 누구나 아는 뻔한 조언은 절대 쓰지 않습니다. 독자가 이미 알고 있는 상식을 반복하는 것은 글의 가치를 0으로 만듭니다. 반드시 독자가 "이런 사실이 있었어?" 하고 놀랄 만한 반전 정보, 최신 스포츠과학 연구 기반의 새로운 사실, 트레이너도 잘 알려주지 않는 숨겨진 진실을 중심으로 작성하세요.',
  health:    '10년 경력 국가공인 생활스포츠지도사이자 스포츠영양사. 체중감량·근력운동·유산소·식단·홈트레이닝 등 과학적 근거 기반의 다이어트·운동 정보를 30~50대 일반인이 이해하기 쉽게 전달. 섣부른 효과 보장은 하지 않으며 개인차가 있음을 항상 명시.',
};

// ─── 글 생성 (2단계: 메타데이터 → 본문 분리) ──────────────────────────────────
async function generatePost(keyword, categorySlug, topicId = null) {
  // 모든 카테고리를 fitness 전문가 역할로 통일
  const effectiveSlug = 'fitness';
  const role = SYSTEM_ROLES[effectiveSlug] || '전문 블로그 작가.';
  const isHealth = true; // 운동·다이어트 특화 지침 항상 적용

  // 주제별 콘텐츠 각도 — topicId가 있을 때 적용
  const angleInfo = topicId ? TOPIC_CONTENT_ANGLES[topicId] : null;
  const angleBlock = angleInfo ? `
[이번 글의 콘텐츠 전략 — 반드시 준수]
▪ 콘텐츠 각도: ${angleInfo.angle}
▪ 절대 쓰지 말 것: ${angleInfo.forbidden}
▪ 반드시 다룰 핵심 주제 (4가지 중 최소 2가지 이상 포함):
  1. ${angleInfo.focus[0]}
  2. ${angleInfo.focus[1]}
  3. ${angleInfo.focus[2]}
  4. ${angleInfo.focus[3]}

독자가 "이건 정말 몰랐다!", "이걸 왜 지금 알았지?" 라고 반응해야 성공적인 글입니다.
상식·뻔한 조언을 쓰면 즉시 실격입니다. 반드시 놀라운 반전과 새로운 정보 중심으로 쓰세요.
` : '';

  const systemPrompt = `당신은 ${role}
모든 텍스트는 순수 한국어로만 작성합니다. 외국어 문자(중국어·일본어·베트남어·러시아어 등) 사용 금지.
영어는 IT 용어, 브랜드명 등 꼭 필요한 경우에만 사용합니다.
AI가 쓴 티가 나지 않도록 실제 전문가가 직접 쓴 것처럼 자연스럽게 작성합니다.
제목과 본문에 특정 연도(2023년, 2024년 등 과거 연도)를 절대 사용하지 않습니다. 시간이 지나도 유효한 정보(Evergreen Content)로 작성합니다.
${isHealth ? `
[3050 다이어트·운동 독자 특화 지침]
- 주요 독자: 30~50대 (다이어트·운동에 관심 높고, 실천 의지 강하지만 바쁜 직장인·부모)
- 문장은 짧고 명확하게. 한 문장에 한 가지 정보만.
- 어려운 운동·영양 용어는 반드시 괄호로 쉬운 설명 병기 (예: 인슐린 저항성(혈당을 낮추는 기능이 떨어진 상태))
- "당장 오늘부터 할 수 있는 것"을 항상 포함
- 부상 위험·주의사항도 명확히 안내
- 지인에게 공유하고 싶을 만큼 실용적이고 신뢰감 있는 톤 유지
` : ''}${angleBlock}
[구글 E-E-A-T 품질 기준 준수]
- Experience(경험): 실제 경험에서 나온 구체적 사례와 에피소드 포함
- Expertise(전문성): 전문 용어와 심화 개념을 쉽게 풀어서 설명
- Authoritativeness(권위): 공신력 있는 연구·기관·통계 수치 인용
- Trustworthiness(신뢰): 주의사항·한계·예외 케이스도 솔직하게 언급
- 독자가 이 글을 읽고 나서 다른 곳을 찾아볼 필요가 없을 만큼 완결성 있게 작성`;

  // ── 1단계: 메타데이터 생성 ──────────────────────────────────────────────────
  const metaRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.75,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `키워드: "${keyword}"
${angleInfo ? `콘텐츠 각도: ${angleInfo.angle}
제목도 이 각도를 반영해 "반전", "충격", "의외의 사실", "몰랐던", "위험한" 등 호기심·긴장감을 유발하는 표현을 포함하세요.` : ''}

아래 JSON 메타데이터만 생성하세요 (본문 제외).
⚠️ 제목에 특정 연도(2023, 2024 등 과거 연도) 절대 포함 금지. 시간이 지나도 유효한 제목으로 작성.
{
  "titles": ["반전형 제목 (예: '○○이 오히려 혈당 올린다')", "숫자+충격형 제목 (예: '10명 중 7명이 모르는 ○○의 진실')", "경고형 제목 (예: '지금 당장 멈춰야 할 ○○ 습관')"],
  "selectedTitle": "클릭률 높은 제목 1개 (30~45자, 핵심 키워드 포함, 연도 포함 금지, 반전·충격·호기심 유발)",
  "metaTitle": "검색결과 타이틀 (55자 이내, 키워드 포함)",
  "metaDescription": "검색결과 설명 (140~155자, 키워드 + 궁금증 유발 + 클릭 유도)",
  "excerpt": "글 요약 (120~150자, 핵심 가치 전달)",
  "keywords": ["핵심키워드", "관련키워드2", "관련키워드3", "롱테일1", "롱테일2"],
  "sections": ["섹션1 소제목", "섹션2 소제목", "섹션3 소제목", "섹션4 소제목"],
  "unsplashQuery": "2-3 English words for Unsplash thumbnail photo search, specific to topic (e.g. 'healthy blood sugar food', 'youtube creator monetization', 'real estate investment')",
  "unsplashBodyQueries": ["English photo search term 1 related to topic", "English photo search term 2 related to topic"]
}`,
      },
    ],
  });

  const meta = JSON.parse(metaRes.choices[0].message.content);

  // ── 2단계: 본문 HTML 생성 ─────────────────────────────────────────────────
  const contentRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.75,
    max_tokens: 5000,
    messages: [
      { role: 'system', content: `${systemPrompt}\nHTML 형식의 블로그 본문만 작성합니다. JSON 없이 HTML만 출력합니다.` },
      {
        role: 'user',
        content: `키워드: "${keyword}"
제목: "${meta.selectedTitle}"
섹션 구성: ${meta.sections.join(' / ')}
${angleInfo ? `
[이 글의 핵심 방향 — 반드시 지킬 것]
각도: ${angleInfo.angle}
금지 내용: ${angleInfo.forbidden}
반드시 포함할 놀라운 정보 (2가지 이상):
  - ${angleInfo.focus[0]}
  - ${angleInfo.focus[1]}
  - ${angleInfo.focus[2]}
` : ''}
위 구성으로 핵심만 담은 간결하고 완성도 높은 블로그 본문 HTML을 작성하세요.

[필수 조건]
1. 순수 텍스트 기준 1,800~2,500자 (HTML 태그 제외) — 간결하고 핵심만 담아야 합니다
2. 각 섹션 300~400자 내외 — 핵심 정보만 압축
3. 구체적 수치(연구 결과, 통계, %) 1~2개씩 포함
4. 문단은 2~3문장 단위로 짧고 명확하게
5. ⚠️ 뻔한 상식(운동하세요, 균형 잡힌 식단, 금연 등)은 절대 쓰지 말 것
6. 독자가 스크롤 없이 5분 안에 끝까지 읽을 수 있는 분량
7. 각 섹션은 핵심 포인트 1~2개에 집중 — 여러 가지 나열 금지

HTML 구조 (반드시 이 순서로, </article>로 반드시 닫을 것):
<article>

<section class="intro">
  <div class="summary-box">
    <ul>
      <li>핵심 포인트 1 (한 줄)</li>
      <li>핵심 포인트 2 (한 줄)</li>
      <li>핵심 포인트 3 (한 줄)</li>
    </ul>
  </div>
  <p>서론 (독자 공감 + 글 방향, 2~3문장)</p>
</section>

<section>
  <h2>${meta.sections[0] || '핵심 원인'}</h2>
  <p>핵심 내용 (3문장, 수치/근거 포함)</p>
  <div class="info-box"><p>핵심 요약 1줄</p></div>
</section>

<section>
  <h2>${meta.sections[1] || '당장 실천하는 방법'}</h2>
  <p>핵심 방법 설명 (2~3문장)</p>
  <ol>
    <li><strong>방법 1:</strong> 구체적 설명 (1~2문장)</li>
    <li><strong>방법 2:</strong> 구체적 설명 (1~2문장)</li>
    <li><strong>방법 3:</strong> 구체적 설명 (1~2문장)</li>
  </ol>
</section>

<section>
  <h2>${meta.sections[2] || '많이 하는 실수'}</h2>
  <p>흔한 오해 설명 (2~3문장, 반전 정보 포함)</p>
  <div class="warning-box">
    <ul>
      <li>주의사항 1 — 이유 한 줄</li>
      <li>주의사항 2 — 이유 한 줄</li>
    </ul>
  </div>
</section>

<section>
  <h2>${meta.sections[3] || '병원 가야 할 신호'}</h2>
  <p>위험 신호 설명 (2~3문장)</p>
  <div class="tip-box">
    <ul>
      <li>즉시 병원 가야 할 증상 1</li>
      <li>즉시 병원 가야 할 증상 2</li>
      <li>즉시 병원 가야 할 증상 3</li>
    </ul>
  </div>
</section>

<section>
  <h2>자주 묻는 질문</h2>
  <div class="faq-item"><p class="faq-q">Q. 자주 묻는 질문 1?</p><p>A. 간결한 답변 (2문장)</p></div>
  <div class="faq-item"><p class="faq-q">Q. 자주 묻는 질문 2?</p><p>A. 간결한 답변 (2문장)</p></div>
</section>

<section class="conclusion">
  <div class="info-box"><p>핵심 한 줄 요약: <strong>[오늘 당장 실천할 것]</strong></p></div>
  <div class="cta-box">
    <p class="cta-title">📌 이 글이 도움이 되셨나요?</p>
    <div class="cta-buttons">
      <a href="/" class="cta-btn cta-btn-primary">더 많은 건강 정보 보기 →</a>
      <button class="cta-btn cta-btn-share" onclick="navigator.share ? navigator.share({title: document.title, url: location.href}) : window.open('https://story.kakao.com/share?url=' + encodeURIComponent(location.href))">📤 카카오톡 공유</button>
    </div>
    <p class="cta-sub">가족·친구에게 공유하면 더 큰 도움이 됩니다 💚</p>
  </div>
</section>

</article>`,
      },
    ],
  });

  // GPT가 ```html ... ``` 마크다운 코드블록으로 감싸서 반환하는 경우 제거
  let content = contentRes.choices[0].message.content.trim();
  content = content.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  const textLen = content.replace(/<[^>]*>/g, '').length;
  console.log(`    본문 길이: ${textLen.toLocaleString()}자`);

  return {
    ...meta,
    content,
    readTime: Math.max(1, Math.ceil(textLen / 500)),
  };
}

// ─── 관련 글 연결 ─────────────────────────────────────────────────────────────
async function linkRelated(postId, categoryId, keywords) {
  const kwArr = Array.isArray(keywords) ? keywords : JSON.parse(keywords || '[]');
  const candidates = await prisma.post.findMany({
    where: { id: { not: postId }, categoryId },
    select: { id: true, keywords: true },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  const relatedIds = [];
  for (const c of candidates) {
    const cKws = JSON.parse(c.keywords || '[]');
    if (kwArr.some((k) => cKws.includes(k))) relatedIds.push(c.id);
    if (relatedIds.length >= 4) break;
  }

  for (const rid of relatedIds) {
    await prisma.postRelation.upsert({
      where: { postId_relatedId: { postId, relatedId: rid } },
      update: {},
      create: { postId, relatedId: rid },
    }).catch(() => {});
  }
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  const hasPexels = !!process.env.UNSPLASH_ACCESS_KEY;
  console.log(`=== 콘텐츠 생성 시작 (GPT-4o-mini${hasPexels ? ' + Unsplash' : ''}) ===`);
  console.log(`생성 목표: ${generateCount}개\n`);

  let success = 0, fail = 0;

  try {
    const keywords = await prisma.keyword.findMany({
      where: {
        used: false,
        ...(targetCategory && { category: { slug: targetCategory } }),
      },
      include: { category: true },
      orderBy: [{ priority: 'asc' }, { searchVolume: 'desc' }],
      take: Math.max(generateCount * 15, 50), // 주제별 풀 확보를 위해 충분히 로드
    });

    if (!keywords.length) {
      console.log('사용 가능한 키워드 없음. npm run collect:keywords 먼저 실행하세요.');
      return;
    }

    // 카테고리 ID 캐싱
    const travelCat = await prisma.category.findUnique({ where: { slug: 'travel' } });
    // "운동지식" 카테고리 없으면 자동 생성
    const knowledgeCat = await prisma.category.upsert({
      where: { slug: 'knowledge' },
      update: {},
      create: { name: '운동지식', slug: 'knowledge', description: '다이어트·운동 관련 다양한 건강 정보' },
    });
    const knownSlugs = ['fitness', 'health', 'tech', 'economy', 'lifestyle', 'travel', 'knowledge'];

    // 알 수 없는 카테고리 키워드 → fitness로 재배정
    for (const kw of keywords) {
      if (!knownSlugs.includes(kw.category?.slug)) {
        kw.category = { slug: 'fitness' };
      }
    }

    // 최근 발행 글로 중복 방지 + 마지막 주제 파악
    const recentPublished = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true, keywords: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    const usedKeywordSet = new Set(
      recentPublished.flatMap((p) => JSON.parse(p.keywords || '[]'))
    );

    // 마지막 발행 글의 주제 파악 → 다음 주제 결정
    let lastTopicId = null;
    for (const p of recentPublished) {
      const kws = JSON.parse(p.keywords || '[]');
      const found = kws.map(getSubTopic).find((t) => t !== null);
      if (found) { lastTopicId = found; break; }
    }

    // 이번 실행에서 순서대로 발행할 주제 목록 결정
    const targetTopics = [];
    let nextTopic = getNextTopic(lastTopicId);
    for (let i = 0; i < generateCount; i++) {
      targetTopics.push(nextTopic);
      nextTopic = getNextTopic(nextTopic);
    }
    console.log(`\n마지막 발행 주제: ${lastTopicId || '없음'}`);
    console.log(`이번 발행 순서: ${targetTopics.map((t) => HEALTH_TOPICS.find((h) => h.id === t)?.label).join(' → ')}\n`);

    // 주제별로 키워드 미리 분류
    const keywordsByTopic = {};
    for (const kw of keywords) {
      const topic = getSubTopic(kw.keyword);
      if (!topic) continue;
      if (!keywordsByTopic[topic]) keywordsByTopic[topic] = [];
      keywordsByTopic[topic].push(kw);
    }

    for (const targetTopic of targetTopics) {
      if (success >= generateCount) break;

      // 해당 주제 키워드 풀에서 미사용·중복 없는 것 선택
      const pool = (keywordsByTopic[targetTopic] || [])
        .filter((kw) => !usedKeywordSet.has(kw.keyword));

      let kw;
      if (pool.length > 0) {
        kw = pool[0];
      } else {
        // 해당 주제 키워드가 없으면 미분류 키워드 중 아무거나
        const fallback = keywords.find(
          (k) => !usedKeywordSet.has(k.keyword) && !targetTopics.slice(0, success).includes(getSubTopic(k.keyword))
        );
        if (!fallback) {
          console.log(`  ⚠️  [${HEALTH_TOPICS.find((h) => h.id === targetTopic)?.label}] 사용 가능한 키워드 없음. 건너뜀.`);
          continue;
        }
        kw = fallback;
      }

      const topic = getSubTopic(kw.keyword) || targetTopic;
      const topicLabel = HEALTH_TOPICS.find((h) => h.id === topic)?.label || topic;
      console.log(`[${success + 1}/${generateCount}] [${topicLabel}] "${kw.keyword}" 생성 중...`);

      try {
        const gen = await generatePost(kw.keyword, kw.category.slug, topic);

        // Pexels 썸네일 + 본문 이미지
        let thumbnail = null;
        let content = gen.content;

        if (hasPexels) {
          // GPT가 생성한 영어 검색어 사용 (한국어 키워드는 Pexels에서 엉뚱한 결과 반환)
          const thumbQuery = gen.unsplashQuery || kw.keyword;
          const thumbImg = await fetchPexelsImage(thumbQuery);
          if (thumbImg) thumbnail = thumbImg.url;

          const bodyQueries = gen.unsplashBodyQueries && gen.unsplashBodyQueries.length
            ? gen.unsplashBodyQueries
            : gen.keywords.slice(0, 2);
          const bodyImgs = await fetchBodyImages(bodyQueries, 2);
          if (bodyImgs.length) content = injectBodyImages(content, bodyImgs);
        }

        // 쿠팡파트너스 상품 — DB 필드로 분리 저장 (사이드바 카드 렌더링용)
        let coupangProductJson = null;
        if (TOPIC_TO_SHEET[topic]) {
          try {
            const coupangProducts = await fetchCoupangProducts(topic);
            if (coupangProducts.length) {
              const product = coupangProducts[Math.floor(Math.random() * coupangProducts.length)];
              coupangProductJson = JSON.stringify({
                name: product.name,
                url: product.url,
                image: product.image || null,
                price: product.price || null,
                ctaText: '다이어트·운동 추천 제품',
              });
              console.log(`    쿠팡 상품 [${topicLabel}]: "${product.name}"`);
            }
          } catch (e) {
            console.log(`    쿠팡 상품 로딩 실패 (건너뜀): ${e.message}`);
          }
        }

        const postCategoryId = kw.categoryId || knowledgeCat.id;

        const slug = generateSlug(gen.selectedTitle);
        const post = await prisma.post.create({
          data: {
            title: gen.selectedTitle,
            slug,
            excerpt: gen.excerpt,
            content,
            keywords: JSON.stringify(gen.keywords),
            metaTitle: gen.metaTitle,
            metaDescription: gen.metaDescription,
            readTime: gen.readTime,
            thumbnail,
            coupangProduct: coupangProductJson,
            status: 'DRAFT',
            categoryId: postCategoryId,
            keywordId: kw.id,
          },
        });

        await prisma.keyword.update({ where: { id: kw.id }, data: { used: true } });
        await linkRelated(post.id, kw.categoryId, gen.keywords);

        success++;
        console.log(`  ✓ "${gen.selectedTitle}"`);
        console.log(`    읽기 ${gen.readTime}분 | 이미지: ${thumbnail ? '✅ Pexels' : '없음'}\n`);

        if (success < generateCount) await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        fail++;
        console.error(`  ✗ 실패: ${e.message}\n`);
      }
    }

    await prisma.automationLog.create({
      data: {
        type: 'CONTENT_GENERATE',
        status: success > 0 ? 'SUCCESS' : 'FAILED',
        message: `${success}개 생성, ${fail}개 실패`,
      },
    });

    console.log(`✅ 완료: ${success}개 생성`);
  } catch (e) {
    console.error('치명적 오류:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
