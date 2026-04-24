/**
 * 기존 저품질 글 재생성 스크립트
 * 실행: node scripts/regenerate-posts.js
 * 옵션: --status=REVIEW_REQUIRED  (기본값)
 *       --limit=5                  (기본값: 전체)
 *       --dry-run                  (DB 반영 없이 미리보기)
 *
 * REVIEW_REQUIRED / QUALITY_REJECTED 상태의 기존 글을 새 생성 엔진으로 재생성합니다.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// content-generator.js에서 필요한 함수들을 직접 가져오기 위해 require 우선
// (순환 방지: generator 내부 main() 실행은 안 됨 — 환경변수로 차단)
process.env._REGEN_MODE = '1'; // generator의 main()이 자동 실행되지 않도록

const prisma = new PrismaClient();

// content-generator에서 공통 로직 재사용
const OpenAI = require('openai');
const { runQualityGate, plainTextLength } = require('./quality-gate');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const args = process.argv.slice(2);
const getArg = (n) => { const f = args.find((a) => a.startsWith(`--${n}=`)); return f ? f.split('=')[1] : null; };
const targetStatus = getArg('status') || 'REVIEW_REQUIRED';
const limitCount   = parseInt(getArg('limit') || '999');
const isDryRun     = args.includes('--dry-run');

// ─── 재사용: content-generator.js의 핵심 함수들 인라인 복사 ──────────────────

const COUPANG_SHEET_ID = '1f_yqf9AaNx8MF0dYRqE6LleTf37iiLexRbvtELPJ7pk';
const COUPANG_SHEET_NAME = '시트1';

async function fetchCoupangProducts() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${COUPANG_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(COUPANG_SHEET_NAME)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const csv = await res.text();
    const lines = csv.trim().split('\n').slice(1);
    const products = lines.map((line) => {
      const cols = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      const clean = (v) => (v || '').replace(/^"|"$/g, '').trim();
      const name = clean(cols[0]); const url2 = clean(cols[1]);
      const image = clean(cols[2]);
      const rawPrice = clean(cols[3]);
      const price = rawPrice ? rawPrice.replace(/₩/g, '').replace(/원$/, '').trim().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원' : null;
      return name && url2 ? { name, url: url2, image: image || null, price: price || null } : null;
    }).filter(Boolean);
    return products;
  } catch { return []; }
}

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
    const pool = data.photos.slice(0, 5);
    const photo = pool[Math.floor(Math.random() * pool.length)];
    return { url: photo.src.large, alt: photo.alt || query, credit: `Photo by ${photo.photographer} on Pexels`, creditUrl: photo.photographer_url };
  } catch { return null; }
}

function makeImgHtml(img) {
  return `\n<figure style="margin:2rem 0;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(232,99,26,0.10)">
  <img src="${img.url}" alt="${img.alt}" style="width:100%;max-height:420px;object-fit:cover;display:block" loading="lazy" />
  <figcaption style="font-size:0.75rem;text-align:center;padding:0.5rem 1rem;background:#FFF0E8;color:#6B3A1F">
    <a href="${img.creditUrl}" target="_blank" rel="noopener noreferrer" style="color:#E8631A">${img.credit}</a>
  </figcaption>
</figure>`;
}

function injectBodyImages(content, images) {
  if (!images.length) return content;
  const sectionCount = (content.match(/<\/section>/g) || []).length;
  if (sectionCount >= 2) {
    let count = 0, imgIdx = 0;
    return content.replace(/<\/section>/g, (match) => {
      count++;
      if ((count === 2 || count === 4) && imgIdx < images.length) return match + makeImgHtml(images[imgIdx++]);
      return match;
    });
  }
  const h2Count = (content.match(/<\/h2>/g) || []).length;
  if (h2Count >= 2) {
    let count = 0, imgIdx = 0;
    return content.replace(/<\/h2>/g, (match) => {
      count++;
      if ((count === 2 || count === 4) && imgIdx < images.length) return match + makeImgHtml(images[imgIdx++]);
      return match;
    });
  }
  return content;
}

// 페르소나
const CATEGORY_PERSONAS = {
  diet:         '10년 경력의 생활스포츠지도사 1급이자 스포츠영양사. 체지방 감량 속도는 주당 0.5~1%를 기본으로 하며 급속 감량을 권하지 않는다. 단백질 권장량은 체중 1kg당 1.4~2.0g 범위로 제시. 탄수화물·지방을 악마화하지 않는다.',
  exercise:     '10년 경력의 생활스포츠지도사 1급. 운동생리학 기반으로 근력 향상 원리를 설명. 초보자 안전을 최우선으로 하며 부상 예방 정보를 반드시 포함. 점진적 과부하 원칙을 구체적 수치로 안내.',
  hometraining: '10년 경력의 퍼스널 트레이너. 도구 없이 체중만으로 효과를 극대화하는 맨몸운동 전문가. 공간 제약, 시간 제약을 가진 독자를 위한 현실적 루틴 제안.',
  running:      '10년 경력의 달리기 코치이자 스포츠의학 전문 트레이너. 초보자 부상 예방을 최우선으로 하며 페이스·심박수·회복 관리를 구체적으로 안내.',
  nutrition:    '10년 경력의 스포츠영양사. 탄단지 비율, 칼로리 계산, 혈당 관리를 과학적으로 설명. 식품의약품안전처 기준 내에서 식단을 설계하며 외식·간식 상황도 현실적으로 안내.',
  supplement:   '10년 경력의 스포츠영양사이자 이너뷰티 전문가. 영양제 성분을 INCI 기준으로 설명. 과장 광고 없이 실제 임상 근거 기반으로 효능을 설명하며 복용 기준과 주의사항을 명확히 안내.',
  health:       '10년 경력의 건강관리사이자 운동처방사. 수면·스트레스·혈압·장건강 등 생활습관 개선 전문. 질병 진단·치료 조언 없이 생활 개선 중심으로 안내하며 반드시 의료진 상담을 권고.',
  skincare:     '10년 경력의 피부미용사이자 화장품 성분 전문가. 성분 이름은 INCI 기준 영문+한글 병기.',
  beauty:       '10년 경력의 뷰티 에디터이자 화장품 성분 분석가.',
  motivation:   '10년 경력의 스포츠심리 상담사이자 퍼스널 트레이너. 운동 지속을 방해하는 심리적 요인을 분석하고 습관 형성 과학에 기반한 실천 전략을 제시.',
  weightloss:   '10년 경력의 생활스포츠지도사 1급이자 스포츠영양사. 체지방 감량 속도는 주당 0.5~1%를 기본으로 한다.',
  strength:     '10년 경력의 생활스포츠지도사 1급. 근력 향상·부상 예방 전문.',
  cardio:       '10년 경력의 달리기 코치이자 스포츠의학 전문 트레이너.',
};

const TOPIC_TO_CATEGORY = {
  weightloss: 'diet', strength: 'exercise', cardio: 'running',
  nutrition: 'nutrition', hometraining: 'hometraining', motivation: 'motivation',
};

const STRUCTURE_TYPES = ['story', 'checklist', 'compare', 'guide', 'qna'];

async function regenerateContent(post) {
  // 카테고리 slug 결정
  const catSlug = post.category?.slug || 'diet';
  const topicId = TOPIC_TO_CATEGORY[catSlug] ? catSlug : null;
  const catKey  = TOPIC_TO_CATEGORY[catSlug] || catSlug || 'diet';
  const persona = CATEGORY_PERSONAS[catKey] || CATEGORY_PERSONAS.diet;

  const structureType = STRUCTURE_TYPES[Math.floor(Math.random() * STRUCTURE_TYPES.length)];
  const structureGuide = {
    story:     '스토리형: 30~45세 독자 실제 경험담으로 시작 → 문제 발견 → 해결 과정 → 결론',
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

  // 1단계: 메타 (FAQ 질문 포함)
  const keyword = post.keywords
    ? JSON.parse(post.keywords || '[]')[0] || post.title
    : post.title;

  const metaRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.75,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_BASE },
      { role: 'user', content: `키워드: "${keyword}"
제목을 개선해서 사용하거나 새 제목으로 교체하세요.

JSON만 반환:
{
  "selectedTitle": "제목 (30~45자, 키워드 포함, 연도 없음, 긍정·실용적)",
  "metaDescription": "검색결과 설명 (130~155자, 클릭 유도)",
  "excerpt": "글 요약 (120~145자)",
  "faqQuestions": ["독자가 가장 궁금해할 질문1?","질문2?","질문3?","질문4?"],
  "unsplashQuery": "English 2-3 words for image",
  "unsplashBodyQueries": ["English term1","English term2"]
}` },
    ],
  });
  const meta = JSON.parse(metaRes.choices[0].message.content);

  // 2단계: 본문 (최대 2회 시도)
  const faqQs = meta.faqQuestions || ['이 방법이 정말 효과가 있나요?', '언제부터 시작하는 게 좋나요?', '주의해야 할 점은 무엇인가요?', '얼마나 자주 해야 하나요?'];

  const contentPrompt = `키워드: "${keyword}"
제목: "${meta.selectedTitle}"
글 구조: ${structureGuide}

━━━ 필수 조건 (하나라도 빠지면 글 전체가 실패) ━━━

【분량】 HTML 태그 제거 기준 순수 텍스트 2,800자 이상 필수.
  절대로 중간에 끊지 마세요. 분량이 부족하면 각 섹션을 더 깊이 서술하세요.

【구조】 반드시 아래 순서대로 작성:
  1. 도입 (300자+): 30~45세 독자 실제 사례로 시작 ("39세 직장인 박씨는...")
  2. H2 섹션 × 3개 (각 500자+): 핵심 정보 + 공공기관 데이터 인용
  3. FAQ 섹션 (필수): 아래 4개 질문에 각각 150자 이상 답변
     - ${faqQs.join('\n     - ')}
  4. 주의사항 (100자+): 개인차·전문가 상담 권고
  5. 저자 블록 + CTA 블록

【FAQ HTML 형식】
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
    const textLen = plainTextLength(content);
    console.log(`      본문: ${textLen.toLocaleString()}자 (시도 ${attempt}/2)`);
    if (textLen >= 1800) break;
    if (attempt < 2) {
      console.log('      ⚠️  분량 미달 — 재시도...');
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return { meta, content };
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== 기존 글 재생성 (${targetStatus}) ${isDryRun ? '[DRY RUN]' : ''} ===\n`);

  const posts = await prisma.post.findMany({
    where: { status: { in: [targetStatus, 'QUALITY_REJECTED'] } },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
    take: limitCount,
  });

  console.log(`대상 글: ${posts.length}개\n`);
  if (!posts.length) { console.log('재생성 대상이 없습니다.'); return; }

  const hasPexels = !!process.env.PEXELS_API_KEY;
  let done = 0, fail = 0;

  for (const post of posts) {
    console.log(`\n[${done + 1}/${posts.length}] "${post.title.slice(0, 50)}"`);
    console.log(`  카테고리: ${post.category?.slug || '없음'} | 현재 상태: ${post.status}`);

    const oldLen = (post.content || '').replace(/<[^>]+>/g, '').length;
    console.log(`  기존 본문: ${oldLen.toLocaleString()}자`);

    if (isDryRun) {
      console.log('  [DRY RUN] 스킵');
      continue;
    }

    try {
      const { meta, content } = await regenerateContent(post);

      let finalContent = content;
      let thumbnail = post.thumbnail;

      if (hasPexels) {
        const thumbImg = await fetchPexelsImage(meta.unsplashQuery || post.title);
        if (thumbImg) thumbnail = thumbImg.url;

        const bodyImgs = [];
        for (const q of (meta.unsplashBodyQueries || []).slice(0, 2)) {
          const img = await fetchPexelsImage(q);
          if (img) bodyImgs.push(img);
          await new Promise((r) => setTimeout(r, 300));
        }
        if (bodyImgs.length) finalContent = injectBodyImages(finalContent, bodyImgs);
      }

      // 쿠팡 — 기존 coupangProduct 유지하되, 없으면 새로 가져오기
      let coupangProductJson = post.coupangProduct;
      if (!coupangProductJson) {
        try {
          const products = await fetchCoupangProducts();
          if (products.length) {
            const p = products[Math.floor(Math.random() * products.length)];
            coupangProductJson = JSON.stringify({ name: p.name, url: p.url, image: p.image || null, price: p.price || null, ctaText: '다이어트·운동 추천 제품' });
          }
        } catch { /* 무시 */ }
      }

      // 품질 게이트
      const gate = runQualityGate({ content: finalContent, thumbnail, coupangProduct: coupangProductJson, title: meta.selectedTitle });
      const newStatus = gate.pass ? 'REVIEW_REQUIRED' : 'QUALITY_REJECTED';
      const newLen = plainTextLength(finalContent);

      console.log(`  새 본문: ${newLen.toLocaleString()}자 | 품질: ${gate.score}점 | 상태: ${newStatus}`);
      if (gate.reasons.length) gate.reasons.forEach((r) => console.log(`    - ${r}`));

      await prisma.post.update({
        where: { id: post.id },
        data: {
          title: meta.selectedTitle,
          metaDescription: meta.metaDescription || post.metaDescription,
          excerpt: meta.excerpt || post.excerpt,
          content: finalContent,
          thumbnail,
          coupangProduct: coupangProductJson,
          status: newStatus,
          qualityScore: gate.score,
          rejectReasons: gate.reasons,
          lastUpdatedAt: new Date(),
        },
      });

      done++;
      console.log(`  ✅ 재생성 완료`);

      // API 부하 방지
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.error(`  ❌ 실패: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n=== 완료: ${done}개 재생성 성공 / ${fail}개 실패 ===`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
