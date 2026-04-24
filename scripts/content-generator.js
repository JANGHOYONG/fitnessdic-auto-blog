/**
 * 콘텐츠 자동 생성 스크립트 (GPT-4o-mini + Pexels 이미지 + 품질 게이트)
 * 실행: node scripts/content-generator.js
 * 옵션: --count=3 --category=tech
 *
 * 품질 게이트 통과 → REVIEW_REQUIRED (사람 감수 대기)
 * 품질 게이트 실패 → QUALITY_REJECTED (자동 거절)
 */

require('dotenv').config();
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const { runQualityGate } = require('./quality-gate');

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

// ─── Pexels 이미지 ───────────────────────────────────────────────────────────
async function fetchPexelsImage(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.photos || !data.photos.length) return null;
    // 상위 5개 중 랜덤 선택
    const pool = data.photos.slice(0, 5);
    const photo = pool[Math.floor(Math.random() * pool.length)];
    return {
      url: photo.src.large,
      alt: photo.alt || query,
      credit: `Photo by ${photo.photographer} on Pexels`,
      creditUrl: photo.photographer_url,
    };
  } catch {
    return null;
  }
}

async function fetchBodyImages(keywords, count = 3) {
  const results = [];
  // 키워드가 부족하면 'senior health' 기본 쿼리로 채움
  const queries = [...keywords.slice(0, count)];
  while (queries.length < count) queries.push('fitness workout diet healthy');
  for (const q of queries) {
    const img = await fetchPexelsImage(q);
    if (img) results.push(img);
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}

function makeImgHtml(img) {
  return `
<figure style="margin:2rem 0;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(232,99,26,0.10)">
  <img src="${img.url}" alt="${img.alt}" style="width:100%;max-height:420px;object-fit:cover;display:block" loading="lazy" />
  <figcaption style="font-size:0.75rem;text-align:center;padding:0.5rem 1rem;background:#FFF0E8;color:#6B3A1F">
    <a href="${img.creditUrl}" target="_blank" rel="noopener noreferrer" style="color:#E8631A">${img.credit}</a>
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
  { id: 'weightloss',   label: '체중감량',        category: 'weightloss',   words: ['체중감량', '살빼기', '지방연소', '체중조절', '감량', '체지방감소', '비만', '뱃살', '복부지방', '체지방률', '살이찌는', '살을빼', '체중줄', '지방분해', '요요'] },
  { id: 'strength',     label: '근력운동',        category: 'strength',     words: ['근력운동', '웨이트트레이닝', '웨이트', '벤치프레스', '스쿼트', '데드리프트', '근비대', '근력', '근육량', '중량', '레그프레스', '렛풀다운', '오버헤드프레스', '바벨', '덤벨'] },
  { id: 'cardio',       label: '유산소·러닝',     category: 'cardio',       words: ['유산소운동', '러닝', '달리기', '조깅', '자전거타기', '수영', '마라톤', '심폐지구력', '유산소', '트레드밀', '심박수', '에어로빅', '줄넘기', '인터벌', 'HIIT'] },
  { id: 'nutrition',    label: '식단·영양',       category: 'nutrition',    words: ['식단관리', '영양관리', '칼로리계산', '탄수화물', '식이요법', '끼니', '영양소', '간헐적단식', '식사횟수', '저탄고지', '케토', '저칼로리', '식단조절', '먹는양', '포만감'] },
  { id: 'hometraining', label: '홈트레이닝',      category: 'hometraining', words: ['홈트레이닝', '홈트', '맨몸운동', '집에서운동', '플랭크', '버피', '푸시업', '스트레칭', '요가', '필라테스', '집운동', '맨몸', '실내운동', '홈짐', '바디웨이트'] },
  { id: 'motivation',   label: '바디프로필·동기', category: 'motivation',   words: ['바디프로필', '운동동기', '운동습관', '운동루틴', '운동일지', '몸만들기', '눈바디', '운동지속', '운동계획', '다이어트동기', '운동의지', '체형관리', '운동목표', '바디체크', '운동기록'] },
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

// ─── 카테고리별 전문가 페르소나 ──────────────────────────────────────────────
const CATEGORY_PERSONAS = {
  diet:         '10년 경력의 생활스포츠지도사 1급이자 스포츠영양사. 체지방 감량 속도는 주당 0.5~1%를 기본으로 하며 급속 감량을 권하지 않는다. 단백질 권장량은 체중 1kg당 1.4~2.0g 범위로 제시. 탄수화물·지방을 악마화하지 않는다.',
  exercise:     '10년 경력의 생활스포츠지도사 1급. 운동생리학 기반으로 근력 향상 원리를 설명. 초보자 안전을 최우선으로 하며 부상 예방 정보를 반드시 포함. 점진적 과부하 원칙을 구체적 수치로 안내.',
  hometraining: '10년 경력의 퍼스널 트레이너. 도구 없이 체중만으로 효과를 극대화하는 맨몸운동 전문가. 공간 제약, 시간 제약을 가진 독자를 위한 현실적 루틴 제안.',
  running:      '10년 경력의 달리기 코치이자 스포츠의학 전문 트레이너. 초보자 부상 예방을 최우선으로 하며 페이스·심박수·회복 관리를 구체적으로 안내.',
  nutrition:    '10년 경력의 스포츠영양사. 탄단지 비율, 칼로리 계산, 혈당 관리를 과학적으로 설명. 식품의약품안전처 기준 내에서 식단을 설계하며 외식·간식 상황도 현실적으로 안내.',
  supplement:   '10년 경력의 스포츠영양사이자 이너뷰티 전문가. 영양제 성분을 INCI 기준으로 설명. 과장 광고 없이 실제 임상 근거 기반으로 효능을 설명하며 복용 기준과 주의사항을 명확히 안내.',
  health:       '10년 경력의 건강관리사이자 운동처방사. 수면·스트레스·혈압·장건강 등 생활습관 개선 전문. 질병 진단·치료 조언 없이 생활 개선 중심으로 안내하며 반드시 의료진 상담을 권고.',
  skincare:     '10년 경력의 피부미용사이자 화장품 성분 전문가. 성분 이름은 INCI 기준 영문+한글 병기. 피부 타입별(건성/지성/복합성/민감성) 가이드 필수. 식약처 고시 기준 내에서 효능 설명.',
  beauty:       '10년 경력의 뷰티 에디터이자 화장품 성분 분석가. 화장품 성분의 실제 효과를 과학적으로 분석. 트렌드와 실용성을 함께 안내하며 피부과 전문의 상담을 주기적으로 권고.',
  motivation:   '10년 경력의 스포츠심리 상담사이자 퍼스널 트레이너. 운동 지속을 방해하는 심리적 요인을 분석하고 습관 형성 과학에 기반한 실천 전략을 제시.',
};

// 카테고리 → 프롬프트 파일 매핑
const PROMPT_FILE_MAP = {
  diet: 'diet', exercise: 'diet', hometraining: 'diet', running: 'diet', motivation: 'diet',
  nutrition: 'diet', supplement: 'health',
  health: 'health',
  skincare: 'beauty', beauty: 'beauty',
};

// 하위 호환 — 기존 topic ID도 지원
const TOPIC_TO_CATEGORY = {
  weightloss: 'diet', strength: 'exercise', cardio: 'running',
  nutrition: 'nutrition', hometraining: 'hometraining', motivation: 'motivation',
};

// ─── 글 생성 (2단계: 메타 → 본문) ────────────────────────────────────────────
async function generatePost(keyword, categorySlug, topicId = null) {
  // 카테고리별 전문가 페르소나
  const catKey = TOPIC_TO_CATEGORY[topicId] || categorySlug || 'diet';
  const persona = CATEGORY_PERSONAS[catKey] || CATEGORY_PERSONAS.diet;

  // 콘텐츠 각도
  const angleInfo = topicId ? TOPIC_CONTENT_ANGLES[topicId] : null;

  // 글 구조 타입 (매번 다르게)
  const STRUCTURE_TYPES = ['story', 'checklist', 'compare', 'guide', 'qna'];
  const structureType = STRUCTURE_TYPES[Math.floor(Math.random() * STRUCTURE_TYPES.length)];
  const structureGuide = {
    story:     '스토리형: 30~40대 독자 실제 경험담으로 시작 → 문제 발견 → 해결 과정 → 결론',
    checklist: '체크리스트형: 자가진단 5항목 → 각 항목 상세 해설 → 개선법 → 종합 조언',
    compare:   '비교분석형: 일반 통념 vs 실제 사실 대조표 → 올바른 방법 → 주의사항',
    guide:     '단계별 가이드형: 왜 중요한가 → 준비 → 실행 → 유지관리 → 주의사항',
    qna:       'Q&A형: 독자가 가장 많이 묻는 질문 4개 → 각각 300자 이상 심층 답변',
  }[structureType];

  const SYSTEM_BASE = `당신은 ${persona}

[절대 금지]
- "치료한다", "낫게 한다", "기적의", "무조건", "확실히 효과" 같은 표현
- "열심히 하세요", "꾸준히 하세요", "균형 잡힌 식단" 같은 뻔한 조언
- 과거 특정 연도(예: 2023년, 2024년) 사용 — Evergreen 콘텐츠로 작성
- 중국어·일본어 등 외국어 문자 사용
- AI가 쓴 티 나는 기계적 문장 ("또한", "따라서", "즉" 반복)

[반드시 포함]
- 개인차 명시: "개인 체력·건강 상태에 따라 다를 수 있습니다" 최소 1회
- 공공기관 데이터 인용: 국민체육진흥공단·한국영양학회·국민건강영양조사·질병관리청 중 최소 2회
- 실생활 독자 사례: "37세 직장인 김모씨는..." 같은 구체적 에피소드
- 오늘 당장 실천 가능한 구체적 행동 지침`;

  // ── 1단계: 메타데이터 ────────────────────────────────────────────────────
  const metaRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.75,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_BASE },
      {
        role: 'user',
        content: `키워드: "${keyword}"
${angleInfo ? `콘텐츠 각도: ${angleInfo.angle}` : ''}

JSON만 반환 (설명 없이):
{
  "selectedTitle": "제목 (30~45자, 키워드 포함, 연도 없음, 긍정·실용적)",
  "metaTitle": "검색결과 타이틀 (55자 이내)",
  "metaDescription": "검색결과 설명 (130~155자, 클릭 유도)",
  "excerpt": "글 요약 (120~145자)",
  "keywords": ["키워드1","키워드2","키워드3","키워드4","키워드5"],
  "faqQuestions": ["독자가 가장 궁금해할 질문1?","질문2?","질문3?","질문4?"],
  "sections": ["H2 섹션1 제목","H2 섹션2 제목","H2 섹션3 제목"],
  "unsplashQuery": "English 2-3 words for thumbnail image",
  "unsplashBodyQueries": ["English term1","English term2"]
}`,
      },
    ],
  });

  const meta = JSON.parse(metaRes.choices[0].message.content);

  // ── 2단계: 본문 HTML 생성 ────────────────────────────────────────────────
  const angleBlock = angleInfo
    ? `\n핵심 방향: ${angleInfo.angle}\n절대 쓰지 말 것: ${angleInfo.forbidden}`
    : '';

  const contentPrompt = `키워드: "${keyword}"
제목: "${meta.selectedTitle}"
글 구조: ${structureGuide}
${angleBlock}

━━━ 필수 조건 (하나라도 빠지면 글 전체가 실패) ━━━

【분량】 HTML 태그 제거 기준 순수 텍스트 2,800자 이상 필수.
  절대로 중간에 끊지 마세요. 분량이 부족하면 각 섹션을 더 깊이 서술하세요.

【구조】 반드시 아래 순서대로 작성:
  1. 도입 (300자+): 30~45세 독자 실제 사례로 시작 ("39세 직장인 박씨는...")
  2. H2 섹션 × 3개 (각 500자+): 핵심 정보 + 공공기관 데이터 인용
  3. FAQ 섹션 (필수): 아래 4개 질문에 각각 150자 이상 답변
     - ${(meta.faqQuestions || ['이 방법이 정말 효과가 있나요?','언제부터 시작하는 게 좋나요?','주의해야 할 점은 무엇인가요?','얼마나 자주 해야 하나요?']).join('\n     - ')}
  4. 주의사항 (100자+): 개인차·전문가 상담 권고
  5. 저자 블록 + CTA 블록

【FAQ HTML 형식 — 반드시 이 구조로】
<section class="faq-section" style="margin:2.5rem 0;">
  <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1.25rem;">자주 묻는 질문</h2>
  <div class="faq-item" style="background:#fff;border:1px solid #EFE6DC;border-radius:12px;padding:1rem 1.25rem;margin-bottom:0.75rem;">
    <p class="faq-q" style="font-weight:700;color:#C4501A;margin-bottom:0.5rem;">Q. 질문 내용</p>
    <p style="margin:0;line-height:1.8;">A. 150자 이상의 구체적이고 실용적인 답변...</p>
  </div>
  (4개 반복)
</section>

【저자 블록】
<div class="author-note" style="margin-top:2rem;padding:1rem 1.25rem;background:#FFF5EE;border-left:4px solid #E8631A;border-radius:8px;font-size:0.875rem;color:#6B3A1F;">
  <strong>다이어트·건강 백과 에디터팀</strong>이 작성했습니다. 국민체육진흥공단·한국영양학회·대한스포츠의학회 공개 자료를 바탕으로 검토된 정보입니다. 개인 체력·건강 상태에 따라 다를 수 있으므로 전문가 상담을 권장합니다.
</div>

【CTA 블록】
<div class="cta-box">
  <p class="cta-title">이 글이 도움이 되셨나요?</p>
  <div class="cta-buttons">
    <a href="/" class="cta-btn cta-btn-primary">더 많은 건강 정보 보기 →</a>
    <button class="cta-btn cta-btn-share" onclick="navigator.share?navigator.share({title:document.title,url:location.href}):window.open('https://story.kakao.com/share?url='+encodeURIComponent(location.href))">카카오톡 공유</button>
  </div>
</div>

<article>로 시작 </article>로 닫기. JSON 없이 순수 HTML만 출력.`;

  let content = '';
  // 최대 2회 시도 — 분량 미달 시 재시도
  for (let attempt = 1; attempt <= 2; attempt++) {
    const contentRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.72,
      max_tokens: 9000,
      messages: [
        { role: 'system', content: `${SYSTEM_BASE}\nHTML 형식 블로그 본문만 작성. JSON 없이 순수 HTML만 출력.` },
        { role: 'user', content: attempt === 1 ? contentPrompt : contentPrompt + '\n\n⚠️ 이전 응답이 분량 미달이었습니다. 각 섹션을 더 깊고 길게 작성하세요. 2,800자 이상 필수.' },
      ],
    });

    content = contentRes.choices[0].message.content.trim()
      .replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    const textLen = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
    console.log(`    본문 길이: ${textLen.toLocaleString()}자 (시도 ${attempt}/2)`);

    if (textLen >= 1800) break;
    if (attempt < 2) {
      console.log('    ⚠️  분량 미달 — 재시도...');
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const finalLen = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
  return {
    ...meta,
    content,
    readTime: Math.max(1, Math.ceil(finalLen / 500)),
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
  const hasPexels = !!process.env.PEXELS_API_KEY;
  console.log(`=== 콘텐츠 생성 시작 (GPT-4o-mini${hasPexels ? ' + Pexels' : ''}) ===`);
  console.log(`생성 목표: ${generateCount}개\n`);

  let success = 0, fail = 0;

  try {
    const FITNESS_SLUGS = ['weightloss', 'strength', 'cardio', 'nutrition', 'hometraining', 'motivation'];
    const keywords = await prisma.keyword.findMany({
      where: {
        used: false,
        ...(targetCategory
          ? { category: { slug: targetCategory } }
          : { category: { slug: { in: [...FITNESS_SLUGS, 'fitness', 'health'] } } }
        ),
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
    // 6개 fitness 서브 카테고리 자동 생성
    const FITNESS_CATEGORY_DEFS = [
      { slug: 'weightloss',   name: '체중감량',        description: '과학적 체중감량·지방연소 전략' },
      { slug: 'strength',     name: '근력운동',        description: '웨이트 트레이닝·근육량 증가 방법' },
      { slug: 'cardio',       name: '유산소·러닝',     description: '유산소 운동·러닝 가이드' },
      { slug: 'nutrition',    name: '식단·영양',       description: '다이어트 식단·영양 관리' },
      { slug: 'hometraining', name: '홈트레이닝',      description: '집에서 하는 맨몸운동·홈트 루틴' },
      { slug: 'motivation',   name: '바디프로필·동기', description: '운동 동기부여·바디프로필 준비' },
    ];
    for (const def of FITNESS_CATEGORY_DEFS) {
      await prisma.category.upsert({ where: { slug: def.slug }, update: {}, create: def });
    }
    const knownSlugs = ['fitness', 'weightloss', 'strength', 'cardio', 'nutrition', 'hometraining', 'motivation', 'knowledge', 'health', 'tech', 'economy', 'lifestyle', 'travel'];

    // 알 수 없는 카테고리 키워드 → travel로 재배정 (travelCat이 있을 때만)
    for (const kw of keywords) {
      if (!knownSlugs.includes(kw.category?.slug) && travelCat) {
        kw.categoryId = travelCat.id;
        kw.category = travelCat;
      }
    }

    // 최근 발행 글로 중복 방지
    const recentPublished = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true, keywords: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    const usedKeywordSet = new Set(
      recentPublished.flatMap((p) => JSON.parse(p.keywords || '[]'))
    );

    // 로테이션 위치 결정: 발행 글 총 수 기준 (키워드 텍스트 추론 제거)
    const publishedCount = await prisma.post.count({ where: { status: 'PUBLISHED' } });
    const startIdx = publishedCount % TOPIC_ROTATION.length;

    // 이번 실행에서 순서대로 발행할 주제 목록 결정
    const targetTopics = [];
    for (let i = 0; i < generateCount; i++) {
      targetTopics.push(TOPIC_ROTATION[(startIdx + i) % TOPIC_ROTATION.length]);
    }
    console.log(`\n총 발행 글 수: ${publishedCount}개 → 로테이션 시작 인덱스: ${startIdx}`);
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

        // 토픽별 카테고리 결정 — fitness 서브토픽은 각 독립 카테고리
        const fitnessSubtopicSlugs = ['weightloss', 'strength', 'cardio', 'nutrition', 'hometraining', 'motivation'];
        let postCategoryId;
        if (fitnessSubtopicSlugs.includes(topic)) {
          const topicCat = await prisma.category.findUnique({ where: { slug: topic } });
          postCategoryId = topicCat ? topicCat.id : (kw.categoryId || knowledgeCat.id);
        } else {
          postCategoryId = kw.categoryId || knowledgeCat.id;
        }

        const slug = generateSlug(gen.selectedTitle);

        // ── 품질 게이트 ────────────────────────────────────────────────
        const draftForGate = { content, thumbnail, coupangProduct: coupangProductJson };
        const gate = runQualityGate(draftForGate);
        const postStatus = gate.pass ? 'REVIEW_REQUIRED' : 'QUALITY_REJECTED';
        console.log(`    품질 점수: ${gate.score}점 → ${postStatus}`);
        if (!gate.pass) {
          gate.reasons.forEach((r) => console.log(`      ✗ ${r}`));
        }
        // ────────────────────────────────────────────────────────────────

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
            status: postStatus,
            qualityScore: gate.score,
            rejectReasons: gate.pass ? [] : gate.reasons,
            categoryId: postCategoryId,
            keywordId: kw.id,
          },
        });

        await prisma.keyword.update({ where: { id: kw.id }, data: { used: true } });
        await linkRelated(post.id, kw.categoryId, gen.keywords);

        success++;
        console.log(`  ✓ "${gen.selectedTitle}"`);
        console.log(`    읽기 ${gen.readTime}분 | 이미지: ${thumbnail ? '✅ Pexels' : '없음'} | 상태: ${postStatus}\n`);

        if (success < generateCount) await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        // keywordId 중복 오류 → 이미 해당 키워드로 DRAFT/글 존재. used=true 처리 후 스킵
        if (e.message && e.message.includes('keywordId')) {
          console.log(`  ⚠ 키워드 중복 (이미 생성된 글 있음) → used 처리 후 스킵: ${kw.keyword}\n`);
          try { await prisma.keyword.update({ where: { id: kw.id }, data: { used: true } }); } catch {}
        } else {
          fail++;
          console.error(`  ✗ 실패: ${e.message}\n`);
        }
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
