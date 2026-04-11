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
      creditUrl: `${photo.user.links.html}?utm_source=smartinfohealth&utm_medium=referral`,
    };
  } catch {
    return null;
  }
}

async function fetchBodyImages(keywords, count = 3) {
  const results = [];
  // 키워드가 부족하면 'senior health' 기본 쿼리로 채움
  const queries = [...keywords.slice(0, count)];
  while (queries.length < count) queries.push('fitness diet women workout');
  for (const q of queries) {
    const img = await fetchPexelsImage(q);
    if (img) results.push(img);
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}

function makeImgHtml(img) {
  return `
<figure style="margin:2rem 0;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(139,115,85,0.10)">
  <img src="${img.url}" alt="${img.alt}" style="width:100%;max-height:420px;object-fit:cover;display:block" loading="lazy" />
  <figcaption style="font-size:0.75rem;text-align:center;padding:0.5rem 1rem;background:#F5EDE4;color:#63523F">
    <a href="${img.creditUrl}" target="_blank" rel="noopener noreferrer" style="color:#8B7050">${img.credit}</a>
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
  // ⚠️ words 배열 순서 중요 — getSubTopic()은 첫 번째 매칭 주제를 반환함
  // '다이어트' 같은 범용 단어를 weightloss에서 제거하고 각 주제 고유 단어만 사용
  { id: 'weightloss',   label: '체중감량',        category: 'fitness',   words: ['체중감량', '살빼기', '지방연소', '체중조절', '감량', '체지방감소', '비만', '뱃살', '복부지방', '체지방률', '살이찌는', '살을빼', '체중줄', '지방분해', '요요'] },
  { id: 'strength',     label: '근력운동',        category: 'fitness',   words: ['근력운동', '웨이트트레이닝', '웨이트', '벤치프레스', '스쿼트', '데드리프트', '근비대', '근력', '근육량', '중량', '레그프레스', '렛풀다운', '오버헤드프레스', '바벨', '덤벨'] },
  { id: 'cardio',       label: '유산소·러닝',     category: 'fitness',   words: ['유산소운동', '러닝', '달리기', '조깅', '자전거타기', '수영', '마라톤', '심폐지구력', '유산소', '트레드밀', '심박수', '에어로빅', '줄넘기', '인터벌', 'HIIT'] },
  { id: 'nutrition',    label: '식단·영양',       category: 'fitness',   words: ['식단관리', '영양관리', '칼로리계산', '탄수화물', '식이요법', '끼니', '영양소', '간헐적단식', '식사횟수', '저탄고지', '케토', '저칼로리', '식단조절', '먹는양', '포만감'] },
  { id: 'hometraining', label: '홈트레이닝',      category: 'fitness',   words: ['홈트레이닝', '홈트', '맨몸운동', '집에서운동', '플랭크', '버피', '푸시업', '스트레칭', '요가', '필라테스', '집운동', '맨몸', '실내운동', '홈짐', '바디웨이트'] },
  { id: 'motivation',   label: '바디프로필·동기', category: 'fitness',   words: ['바디프로필', '운동동기', '운동습관', '운동루틴', '운동일지', '몸만들기', '눈바디', '운동지속', '운동계획', '다이어트동기', '운동의지', '체형관리', '운동목표', '바디체크', '운동기록'] },
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
    .replace(/\s+/g, '-')           // 공백 → 하이픈
    .replace(/[?!?!.,'"]/g, '')     // 특수문자 제거
    .replace(/-+/g, '-')            // 연속 하이픈 정리
    .replace(/^-|-$/g, '')          // 앞뒤 하이픈 제거
    .slice(0, 60);
  return `${simplified}-${timestamp}`;
}

// ─── 주제별 콘텐츠 각도 (긍정·실용·과학 정보 중심) ────────────────────────────
const TOPIC_CONTENT_ANGLES = {
  weightloss: {
    angle: '실용형 — 과학적으로 검증된 체중감량 방법과 지속 가능한 다이어트 전략',
    forbidden: '적게 먹고 많이 움직이세요, 균형 잡힌 식단, 의지를 가지세요 같은 뻔한 조언',
    focus: [
      '하루 10분 습관만 바꿔도 한 달에 1~2kg 빠지는 생활 속 실천법',
      '요요 없이 감량 체중을 유지하는 사람들의 공통 생활 습관',
      '내 체질에 맞는 다이어트 방법을 찾는 과학적 기준과 체크리스트',
      '지방을 효율적으로 태우는 식사 타이밍과 운동 조합의 최신 연구 결과',
    ],
  },
  strength: {
    angle: '성장형 — 근력 향상을 위한 단계별 가이드와 올바른 운동 루틴',
    forbidden: '꾸준히 하세요, 고중량으로 하세요, 프로틴 드세요 같은 뻔한 조언',
    focus: [
      '초보자도 4주 만에 눈에 띄는 근육 변화를 만드는 과학적 루틴',
      '여성에게 최적화된 근력 운동 순서와 세트·횟수 설정법',
      '단백질 흡수를 최대화하는 식사 타이밍과 조합 방법',
      '운동 후 빠른 회복을 돕는 생활 습관과 영양 전략',
    ],
  },
  cardio: {
    angle: '효율형 — 최소 시간으로 최대 지방 연소 효과를 내는 유산소 전략',
    forbidden: '30분 이상 하세요, 조깅하세요, 꾸준히 하세요 같은 뻔한 조언',
    focus: [
      '바쁜 직장인도 가능한 20분 고효율 유산소 루틴 — 지방 연소 극대화',
      '걷기만 해도 체지방이 줄어드는 조건과 올바른 걷기 자세',
      '유산소와 근력 운동을 같이 하면 효과가 2배 되는 최적 순서',
      '실내에서 할 수 있는 유산소 운동 TOP5 — 날씨와 상관없이 꾸준히',
    ],
  },
  nutrition: {
    angle: '영양형 — 다이어트 중에도 맛있게 먹으면서 살 빠지는 식단 전략',
    forbidden: '채소 많이 드세요, 단백질 챙기세요, 탄수화물 줄이세요 같은 뻔한 조언',
    focus: [
      '포만감은 높이고 칼로리는 낮추는 식품 조합과 조리법',
      '다이어트 중 외식할 때 현명하게 선택하는 메뉴 가이드',
      '단백질을 맛있게 충분히 섭취하는 하루 식단 구성 예시',
      '혈당을 안정적으로 유지해 식욕을 조절하는 식사 순서와 방법',
    ],
  },
  hometraining: {
    angle: '접근형 — 집에서 도구 없이 효과적으로 몸 만드는 단계별 홈트 가이드',
    forbidden: '매일 하세요, 플랭크 하세요, 유튜브 따라 하세요 같은 뻔한 조언',
    focus: [
      '공간 2평으로도 가능한 전신 홈트 루틴 — 초보자 4주 플랜',
      '맨몸 운동으로 헬스장 부럽지 않은 몸을 만드는 강도 조절법',
      '관절 보호하면서 근력 키우는 홈트 동작과 올바른 자세 가이드',
      '하루 15분 홈트로 체형을 바꾼 사람들의 공통 루틴 분석',
    ],
  },
  motivation: {
    angle: '습관형 — 운동을 즐겁게 오래 지속하는 심리 전략과 동기 유지법',
    forbidden: '의지를 가지세요, 목표를 세우세요, 꾸준히 하면 됩니다 같은 뻔한 조언',
    focus: [
      '운동이 자연스러운 일상이 되게 만드는 습관 설계 방법',
      '바디프로필 도전자들이 건강하게 몸을 만드는 현실적인 준비 과정',
      '슬럼프 없이 1년 이상 운동을 지속한 사람들의 마인드셋',
      '운동이 즐거워지는 나만의 루틴 찾기 — 성격 유형별 추천 운동',
    ],
  },
};

// ─── 카테고리별 전문가 역할 ───────────────────────────────────────────────────
const SYSTEM_ROLES = {
  fitness:   '10년 경력 국가공인 생활스포츠지도사이자 스포츠영양사. 체중감량·근력운동·유산소·식단·홈트레이닝 등 과학적 근거 기반의 다이어트·운동 정보를 30~50대 일반인이 이해하기 쉽게 전달. 섣부른 효과 보장은 하지 않으며 개인차가 있음을 항상 명시. ⚠️ 절대 금지: "열심히 하세요", "꾸준히 하세요", "균형 잡힌 식단" 같이 누구나 아는 뻔한 조언은 절대 쓰지 않습니다. 독자가 이미 알고 있는 상식을 반복하는 것은 글의 가치를 0으로 만듭니다. 반드시 독자가 "나한테 딱 필요한 정보다!", "오늘 바로 해봐야겠다!" 라고 반응할 만큼 구체적이고 실천 가능한 정보, 최신 스포츠과학 연구 기반의 새로운 사실, 단계별 실천 가이드를 중심으로 긍정적이고 신뢰감 있게 작성하세요.',
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

독자가 "나한테 딱 필요한 정보다!", "오늘 바로 해봐야겠다!" 라고 반응해야 성공적인 글입니다.
뻔한 조언을 쓰면 즉시 실격입니다. 반드시 구체적이고 실천 가능한 정보 중심으로 쓰세요.
` : '';

  const systemPrompt = `당신은 ${role}
모든 텍스트는 순수 한국어로만 작성합니다. 외국어 문자(중국어·일본어·베트남어·러시아어 등) 사용 금지.
영어는 IT 용어, 브랜드명 등 꼭 필요한 경우에만 사용합니다.
AI가 쓴 티가 나지 않도록 실제 전문가가 직접 쓴 것처럼 자연스럽게 작성합니다.
제목과 본문에 특정 연도(2023년, 2024년 등 과거 연도)를 절대 사용하지 않습니다. 시간이 지나도 유효한 정보(Evergreen Content)로 작성합니다.
${isHealth ? `
[10~50대 여성 독자 특화 지침 — 핵심 타겟]
- 주요 독자: 10~50대 여성 (다이어트·운동에 관심 높고, 외모·건강·체력 모두 챙기고 싶지만 바쁜 현실적 상황)
- 페르소나 예시:
  • 20대 여성: 인스타 바디 동경, 다이어트 식단 SNS 공유, 홈트 시작
  • 30~40대 직장 여성: 출산 후 체중 관리, 야근으로 운동 시간 부족, 피로와 체중 증가 동시 고민
  • 50대 여성: 갱년기 이후 살 찌는 속도, 근력 저하, 관절 보호하며 운동하는 법
- 여성 관점 어조: 공감 → 정보 → 실천의 흐름. "나도 이런 적 있어" 공감 코드 포함
- 문장은 짧고 명확하게. 한 문장에 한 가지 정보만.
- 어려운 운동·영양 용어는 반드시 괄호로 쉬운 설명 병기 (예: 인슐린 저항성(혈당을 낮추는 기능이 떨어진 상태))
- "당장 오늘부터 할 수 있는 것"을 항상 포함
- 부상 위험·주의사항도 명확히 안내 (특히 여성 관절·골밀도 관련)
- 지인·가족에게 카톡으로 공유하고 싶을 만큼 실용적이고 신뢰감 있는 톤 유지
- 남성 위주 표현(예: "형, 운동 좀 해봐") 절대 사용 금지
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
제목도 이 각도를 반영해 "방법", "가이드", "효과", "습관", "비결", "전략" 등 긍정적이고 실용적인 표현을 포함하세요.` : ''}

아래 JSON 메타데이터만 생성하세요 (본문 제외).
⚠️ 제목에 특정 연도(2023, 2024 등 과거 연도) 절대 포함 금지. 시간이 지나도 유효한 제목으로 작성.
⚠️ 제목에 "충격", "반전", "위험", "망가", "금지", "절대" 같은 부정·공포 표현 사용 금지.
{
  "titles": ["방법형 제목 (예: '○○ 효과 높이는 5가지 실천법')", "결과형 제목 (예: '하루 20분으로 체지방 줄이는 운동 루틴')", "가이드형 제목 (예: '초보자도 쉽게 따라하는 ○○ 완벽 가이드')"],
  "selectedTitle": "클릭률 높은 제목 1개 (30~45자, 핵심 키워드 포함, 연도 포함 금지, 긍정적·실용적·구체적)",
  "metaTitle": "검색결과 타이틀 (55자 이내, 키워드 포함)",
  "metaDescription": "검색결과 설명 (120~155자, 절대 160자 초과 금지, 키워드 + 10~50대 여성이 공감할 궁금증 유발 + 클릭 유도)",
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
    max_tokens: 8000,
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
위 구성으로 깊이 있고 완성도 높은 블로그 본문 HTML을 작성하세요.

[필수 조건]
1. 순수 텍스트 기준 2,000~3,000자 (HTML 태그 제외) — 깊이 있는 정보 제공
2. 각 섹션 400~600자 내외 — 충분한 설명과 근거 포함
3. 구체적 수치(연구 결과, 통계, %, 시간, 횟수) 각 섹션 1~2개 포함
4. 문단은 3~4문장 단위로 작성 (너무 짧으면 안 됨)
5. ⚠️ 뻔한 상식(운동하세요, 균형 잡힌 식단, 금연 등)은 절대 쓰지 말 것
6. 전문적인 근거와 메커니즘 설명 포함 (왜 그런지 원리까지)
7. 실제 사례나 구체적 시나리오를 들어 독자가 공감하게 작성
8. 각 섹션은 소주제를 충분히 다루되, 핵심에서 벗어나지 않을 것

HTML 구조 (반드시 이 순서로, </article>로 반드시 닫을 것):
<article>

<section class="intro">
  <div class="summary-box">
    <ul>
      <li>핵심 포인트 1 (한 줄 — 독자가 몰랐을 반전 정보)</li>
      <li>핵심 포인트 2 (한 줄 — 구체적 수치 또는 메커니즘)</li>
      <li>핵심 포인트 3 (한 줄 — 오늘 당장 실천 가능한 것)</li>
    </ul>
  </div>
  <p>서론 (독자 공감 + 문제 제기, 3~4문장. 독자가 겪는 구체적 상황 묘사)</p>
  <p>이 글에서 다룰 내용 예고 (2문장)</p>
</section>

<section>
  <h2>${meta.sections[0] || '핵심 원인 분석'}</h2>
  <p>이 현상이 생기는 생리적·과학적 메커니즘 설명 (3~4문장, 연구/통계 포함)</p>
  <p>일반적으로 알려진 상식과 다른 점, 반전 정보 (3문장)</p>
  <div class="info-box"><p>📌 핵심 요약: [이 섹션의 핵심을 1~2문장으로 압축]</p></div>
</section>

<section>
  <h2>${meta.sections[1] || '올바른 접근법'}</h2>
  <p>올바른 방법의 근거와 원리 설명 (3~4문장)</p>
  <ol>
    <li><strong>방법 1:</strong> 구체적 설명 + 실천 방법 (2~3문장)</li>
    <li><strong>방법 2:</strong> 구체적 설명 + 주의사항 포함 (2~3문장)</li>
    <li><strong>방법 3:</strong> 구체적 설명 + 효과 기간/수치 (2~3문장)</li>
  </ol>
  <p>위 방법을 실천할 때 놓치기 쉬운 포인트 (2문장)</p>
</section>

<section>
  <h2>${meta.sections[2] || '많이 하는 실수와 오해'}</h2>
  <p>가장 흔한 오해와 그 오해가 생긴 이유 (3~4문장, 반전 정보 포함)</p>
  <div class="warning-box">
    <ul>
      <li>❌ 실수 1: [구체적 상황] — 왜 문제인지 이유</li>
      <li>❌ 실수 2: [구체적 상황] — 왜 문제인지 이유</li>
      <li>❌ 실수 3: [구체적 상황] — 올바른 대안</li>
    </ul>
  </div>
  <p>이 실수들이 장기적으로 미치는 영향 (2~3문장)</p>
</section>

<section>
  <h2>${meta.sections[3] || '전문가가 권장하는 실전 팁'}</h2>
  <p>실제 현장에서 효과가 검증된 방법 소개 (3문장)</p>
  <div class="tip-box">
    <ul>
      <li>💡 팁 1: 구체적 수치/방법 포함</li>
      <li>💡 팁 2: 구체적 수치/방법 포함</li>
      <li>💡 팁 3: 즉시 실천 가능한 것</li>
      <li>💡 팁 4: 장기적 관점의 조언</li>
    </ul>
  </div>
  <p>이 팁들을 적용할 때 개인차가 있을 수 있는 부분 언급 (2문장)</p>
</section>

<section>
  <h2>자주 묻는 질문 (FAQ)</h2>
  <div class="faq-item"><p class="faq-q">Q. 자주 묻는 질문 1? (구체적이고 실용적인 질문)</p><p>A. 명확하고 근거 있는 답변 (3~4문장, 수치 포함)</p></div>
  <div class="faq-item"><p class="faq-q">Q. 자주 묻는 질문 2? (독자가 헷갈려하는 것)</p><p>A. 명확하고 근거 있는 답변 (3~4문장)</p></div>
  <div class="faq-item"><p class="faq-q">Q. 자주 묻는 질문 3? (심화 질문)</p><p>A. 전문적이지만 쉬운 답변 (3~4문장)</p></div>
</section>

<section class="conclusion">
  <h2>마무리 — 오늘부터 바꿀 한 가지</h2>
  <p>이 글의 핵심 내용을 다시 한번 정리 (3~4문장)</p>
  <div class="info-box"><p>✅ 오늘 당장 실천할 것: <strong>[구체적이고 즉시 실천 가능한 행동 1가지]</strong></p></div>
  <div class="cta-box">
    <p class="cta-title">📌 이 글이 도움이 되셨나요?</p>
    <div class="cta-buttons">
      <a href="/" class="cta-btn cta-btn-primary">더 많은 운동 정보 보기 →</a>
      <button class="cta-btn cta-btn-share" onclick="navigator.share ? navigator.share({title: document.title, url: location.href}) : window.open('https://story.kakao.com/share?url=' + encodeURIComponent(location.href))">📤 카카오톡 공유</button>
    </div>
    <p class="cta-sub">운동하는 가족·친구에게 공유하면 더 큰 도움이 됩니다 💪</p>
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
        // 해당 주제 키워드 pool 고갈 시 — 미사용 키워드 아무거나 가져오되 topic은 targetTopic 강제
        const fallback = keywords.find((k) => !usedKeywordSet.has(k.keyword));
        if (!fallback) {
          console.log(`  ⚠️  [${HEALTH_TOPICS.find((h) => h.id === targetTopic)?.label}] 사용 가능한 키워드 없음. 건너뜀.`);
          continue;
        }
        kw = fallback;
        console.log(`  ℹ️  [${HEALTH_TOPICS.find((h) => h.id === targetTopic)?.label}] 키워드 pool 부족 → fallback 키워드 사용 (주제 각도는 유지)`);
      }

      // 이번 실행 중 중복 선택 방지 — 즉시 사용 처리
      usedKeywordSet.add(kw.keyword);

      // topic은 항상 targetTopic으로 강제 — 로테이션 순서 절대 보장
      const topic = targetTopic;
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
        if (true) {
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
