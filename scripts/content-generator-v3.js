/**
 * 콘텐츠 생성기 v3
 * - 모델: gpt-4o (품질 우선)
 * - 응답: JSON (reader_questions, hook, lead_answer, sections[], stop_signals,
 *           realistic_expectations, common_mistakes, today_action, faq, sources)
 * - 품질 게이트: checkQualityV3 → score < 90 이면 최대 2회 재생성
 * - 저장 상태: 항상 REVIEW_REQUIRED (사람 감수 필수)
 * - 주제: Topic 테이블(PENDING, priority asc) → 없으면 Keyword 테이블 → --topic 인자
 *
 * 실행: node scripts/content-generator-v3.js
 *       node scripts/content-generator-v3.js --topic="스쿼트 제대로 하는 법과 흔한 실수"
 *       node scripts/content-generator-v3.js --count=1 --dry-run
 */

require('dotenv').config();
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const { checkQualityV3 } = require('./quality-check-v3');

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── CLI 인자 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (n) => { const f = args.find((a) => a.startsWith(`--${n}=`)); return f ? f.split('=')[1] : null; };
const TOPIC_OVERRIDE = getArg('topic');
const IS_DRY_RUN    = args.includes('--dry-run');
const COUNT         = parseInt(getArg('count') || process.env.DAILY_DRAFT_COUNT || '1');

// ─── Coupang Partners ────────────────────────────────────────────────────────
const COUPANG_SHEET_ID   = '1f_yqf9AaNx8MF0dYRqE6LleTf37iiLexRbvtELPJ7pk';
const COUPANG_SHEET_NAME = '시트1';

async function fetchCoupangProducts() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${COUPANG_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(COUPANG_SHEET_NAME)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const csv = await res.text();
    return csv.trim().split('\n').slice(1).map((line) => {
      const cols = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      const c = (v) => (v || '').replace(/^"|"$/g, '').trim();
      const name = c(cols[0]); const url2 = c(cols[1]);
      const image = c(cols[2]);
      const rawPrice = c(cols[3]);
      const price = rawPrice ? rawPrice.replace(/₩/g, '').replace(/원$/, '').trim().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원' : null;
      return name && url2 ? { name, url: url2, image: image || null, price } : null;
    }).filter(Boolean);
  } catch { return []; }
}

// ─── Pexels 이미지 ────────────────────────────────────────────────────────────
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
    if (!data.photos?.length) return null;
    const pool = data.photos.slice(0, 5);
    const photo = pool[Math.floor(Math.random() * pool.length)];
    return { url: photo.src.large, alt: photo.alt || query, credit: `Photo by ${photo.photographer} on Pexels`, creditUrl: photo.photographer_url };
  } catch { return null; }
}

// ─── Markdown → HTML 변환 ─────────────────────────────────────────────────────
function mdToHtml(md) {
  if (!md) return '';
  let html = md
    // 헤더
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // 굵게/기울임
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 표 처리 (기본 — | col | col |)
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      return '<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>)/gs, (tableContent) => {
      if (!tableContent.includes('<tr>')) return tableContent;
      // 구분선 행 제거 (---|---|)
      const rows = tableContent.split('\n').filter((r) => !r.match(/^<tr><td>[-|: ]+<\/td>/));
      if (!rows.length) return '';
      const [header, ...body] = rows;
      const thead = header.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
      return `<table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem">\n<thead><tr style="background:#FFF0E8">${thead.replace('<tr>', '').replace('</tr>', '')}</tr></thead>\n<tbody>${body.join('\n')}</tbody>\n</table>`;
    })
    // 순서 없는 목록 블록
    .replace(/((?:^[ \t]*[-*+] .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n')
        .map((l) => l.replace(/^[ \t]*[-*+] /, '').trim())
        .filter(Boolean)
        .map((l) => `<li>${l}</li>`)
        .join('\n');
      return `<ul style="margin:0.75rem 0;padding-left:1.5rem;line-height:1.9">\n${items}\n</ul>`;
    })
    // 순서 있는 목록 블록
    .replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n')
        .map((l) => l.replace(/^[ \t]*\d+\. /, '').trim())
        .filter(Boolean)
        .map((l) => `<li>${l}</li>`)
        .join('\n');
      return `<ol style="margin:0.75rem 0;padding-left:1.5rem;line-height:1.9">\n${items}\n</ol>`;
    })
    // 단락
    .replace(/\n{2,}/g, '\n\n');

  // 단락 감싸기 (이미 HTML 태그가 아닌 줄)
  const lines = html.split('\n\n');
  html = lines.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed;
    return `<p style="line-height:1.9;margin:0.75rem 0">${trimmed.replace(/\n/g, ' ')}</p>`;
  }).filter(Boolean).join('\n');

  return html;
}

// 이미지 HTML
function imgHtml(img) {
  return `<figure style="margin:2rem 0;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(232,99,26,0.10)">
  <img src="${img.url}" alt="${img.alt}" style="width:100%;max-height:420px;object-fit:cover;display:block" loading="lazy" />
  <figcaption style="font-size:0.75rem;text-align:center;padding:0.5rem 1rem;background:#FFF0E8;color:#6B3A1F">
    <a href="${img.creditUrl}" target="_blank" rel="noopener noreferrer" style="color:#E8631A">${img.credit}</a>
  </figcaption>
</figure>`;
}

// JSON 응답을 HTML 본문으로 조립
async function assembleHtml(article, hasPexels) {
  const parts = [];

  // 도입부 (hook + lead_answer)
  parts.push(`<section class="intro" style="margin-bottom:2rem">
  <p style="font-size:1.1rem;line-height:1.9;color:#3D2A1E">${article.hook}</p>
  <p style="margin-top:1rem;padding:1rem 1.25rem;background:#FFF5EE;border-left:4px solid #E8631A;border-radius:0 8px 8px 0;font-size:1rem;font-weight:600;color:#C4501A;line-height:1.7">${article.lead_answer}</p>
</section>`);

  // 섹션별 본문
  for (let i = 0; i < article.sections.length; i++) {
    const sec = article.sections[i];
    let sectionHtml = `<section style="margin:2.5rem 0">\n<h2 style="font-size:1.3rem;font-weight:700;color:#2D1A0E;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #EFE6DC">${sec.h2}</h2>\n${mdToHtml(sec.body)}\n</section>`;

    // 짝수 섹션 뒤에 이미지 삽입
    if (hasPexels && i % 2 === 1) {
      const query = sec.image_query || `fitness diet healthy ${i}`;
      const img = await fetchPexelsImage(query);
      if (img) sectionHtml += '\n' + imgHtml(img);
    }
    parts.push(sectionHtml);
  }

  // 이럴 땐 멈춰라
  if (article.stop_signals?.length) {
    const items = article.stop_signals.map((s) => `<li style="padding:0.4rem 0">${s}</li>`).join('\n');
    parts.push(`<section class="stop-signals" style="margin:2.5rem 0;padding:1.25rem 1.5rem;background:#FEF2F2;border-radius:12px;border:1px solid #FECACA">
  <h2 style="font-size:1.2rem;font-weight:700;color:#991B1B;margin-bottom:1rem">🛑 이런 증상이 오면 멈추세요</h2>
  <ul style="margin:0;padding-left:1.5rem;line-height:1.9;color:#7F1D1D">\n${items}\n  </ul>
</section>`);
  }

  // 현실적 기대치
  if (article.realistic_expectations) {
    const re = article.realistic_expectations;
    parts.push(`<section class="realistic-expectations" style="margin:2.5rem 0;padding:1.25rem 1.5rem;background:#F0FDF4;border-radius:12px;border:1px solid #BBF7D0">
  <h2 style="font-size:1.2rem;font-weight:700;color:#14532D;margin-bottom:1rem">📊 현실적으로 기대할 수 있는 것</h2>
  <ul style="margin:0;padding-left:1.5rem;line-height:1.9;color:#166534">
    <li><strong>언제부터:</strong> ${re.time}</li>
    <li><strong>얼마나:</strong> ${re.magnitude}</li>
    <li><strong>기대하지 마세요:</strong> ${re.what_not_to_expect}</li>
  </ul>
</section>`);
  }

  // 흔한 실수
  if (article.common_mistakes?.length) {
    const items = article.common_mistakes.map((m, idx) => `<li style="padding:0.4rem 0"><strong>${idx + 1}.</strong> ${m}</li>`).join('\n');
    parts.push(`<section class="common-mistakes" style="margin:2.5rem 0">
  <h2 style="font-size:1.2rem;font-weight:700;color:#2D1A0E;margin-bottom:1rem">⚠️ 초보자가 가장 많이 하는 실수</h2>
  <ol style="margin:0;padding-left:1.5rem;line-height:1.9">\n${items}\n  </ol>
</section>`);
  }

  // FAQ
  if (article.faq?.length) {
    const items = article.faq.map((f) => `<div class="faq-item" style="background:#fff;border:1px solid #EFE6DC;border-radius:12px;padding:1rem 1.25rem;margin-bottom:0.75rem">
    <p class="faq-q" style="font-weight:700;color:#C4501A;margin-bottom:0.5rem">Q. ${f.q}</p>
    <p style="margin:0;line-height:1.8">A. ${f.a}</p>
  </div>`).join('\n');
    parts.push(`<section class="faq-section" style="margin:2.5rem 0">
  <h2 style="font-size:1.2rem;font-weight:700;color:#2D1A0E;margin-bottom:1.25rem">자주 묻는 질문</h2>
${items}
</section>`);
  }

  // 오늘의 행동
  if (article.today_action) {
    parts.push(`<section class="today-action" style="margin:2.5rem 0;padding:1.5rem;background:linear-gradient(135deg,#FFF5EE,#FFE8D6);border-radius:16px;border:1px solid #FDDCB5;text-align:center">
  <p style="font-size:0.875rem;font-weight:600;color:#E8631A;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em">오늘 당장 시작</p>
  <p style="font-size:1.125rem;font-weight:700;color:#1E1511;margin:0;line-height:1.6">${article.today_action}</p>
</section>`);
  }

  // 참고 문헌
  if (article.sources?.length) {
    const items = article.sources.map((s) => {
      const link = s.url ? `<a href="${s.url}" target="_blank" rel="noopener noreferrer" style="color:#E8631A">${s.publisher}</a>` : s.publisher;
      return `<li style="padding:0.25rem 0">${s.year} · ${link} — ${s.key_finding}</li>`;
    }).join('\n');
    parts.push(`<section class="sources" style="margin:2.5rem 0;padding:1rem 1.25rem;background:#F8F8F6;border-radius:8px;font-size:0.8rem;color:#6B625C">
  <p style="font-weight:700;margin-bottom:0.5rem;color:#2D1A0E">📚 참고 문헌</p>
  <ul style="margin:0;padding-left:1.25rem;line-height:1.8">\n${items}\n  </ul>
</section>`);
  }

  // 면책 박스 (맨 끝에만)
  parts.push(`<div class="disclaimer" style="margin-top:2.5rem;padding:1rem 1.25rem;background:#F8F8F6;border-radius:8px;font-size:0.78rem;color:#8A7F7A;line-height:1.7">
  <strong>⚠️ 건강 정보 안내</strong><br>
  본 글은 일반적인 영양·운동 정보를 제공합니다. 당뇨·고혈압·갑상선 질환이 있거나 임신·수유 중인 분은 주치의와 상담 후 결정하세요.
</div>`);

  // CTA
  parts.push(`<div class="cta-box" style="margin-top:2rem;padding:1.5rem;background:#FFF5EE;border-radius:16px;text-align:center">
  <p class="cta-title" style="font-weight:700;color:#1E1511;margin-bottom:1rem">이 글이 도움이 되셨나요?</p>
  <div class="cta-buttons" style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap">
    <a href="/" class="cta-btn cta-btn-primary" style="background:#E8631A;color:#fff;padding:0.625rem 1.25rem;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.9rem">더 많은 건강 정보 보기 →</a>
    <button class="cta-btn cta-btn-share" onclick="navigator.share?navigator.share({title:document.title,url:location.href}):window.open('https://story.kakao.com/share?url='+encodeURIComponent(location.href))" style="background:#FAE100;color:#3C1E1E;padding:0.625rem 1.25rem;border-radius:10px;border:none;cursor:pointer;font-weight:700;font-size:0.9rem">카카오톡 공유</button>
  </div>
</div>`);

  return `<article>\n${parts.join('\n\n')}\n</article>`;
}

// ─── 슬러그 생성 ───────────────────────────────────────────────────────────────
function generateSlug(title) {
  return title
    .replace(/\s+/g, '-')
    .replace(/[?!?!.,'"'"]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) + '-' + Date.now();
}

// ─── 주제 가져오기 ─────────────────────────────────────────────────────────────
async function getNextTopic() {
  if (TOPIC_OVERRIDE) {
    return { title: TOPIC_OVERRIDE, keyword: TOPIC_OVERRIDE, categorySlug: null, topicId: null };
  }

  // 1) Topic 테이블 (에디토리얼 캘린더) — PENDING 중 priority 낮은(중요한) 순
  const topic = await prisma.topic.findFirst({
    where: { status: 'PENDING' },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });
  if (topic) {
    return { title: topic.title, keyword: topic.keyword, topicId: topic.id, categorySlug: topic.categoryId };
  }

  // 2) Keyword 테이블 fallback
  const kw = await prisma.keyword.findFirst({
    where: { used: false },
    include: { category: true },
    orderBy: [{ priority: 'asc' }, { searchVolume: 'desc' }],
  });
  if (kw) {
    return { title: kw.keyword, keyword: kw.keyword, keywordId: kw.id, categorySlug: kw.category?.slug };
  }

  throw new Error('사용 가능한 주제가 없습니다. Topic 또는 Keyword 테이블을 확인하세요.');
}

// ─── 카테고리 조회/생성 ────────────────────────────────────────────────────────
async function resolveCategoryId(slug) {
  const SLUG_FALLBACK = 'diet';
  const effectiveSlug = slug || SLUG_FALLBACK;
  let cat = await prisma.category.findUnique({ where: { slug: effectiveSlug } });
  if (!cat) cat = await prisma.category.findUnique({ where: { slug: SLUG_FALLBACK } });
  if (!cat) {
    cat = await prisma.category.upsert({
      where: { slug: SLUG_FALLBACK },
      update: {},
      create: { name: '다이어트', slug: SLUG_FALLBACK, description: '과학적 다이어트 정보' },
    });
  }
  return cat.id;
}

// ─── System Prompt (저자 페르소나 제거판) ──────────────────────────────────────
const SYSTEM_PROMPT_V3 = `당신은 국가공인 생활스포츠지도사·스포츠영양사 자격 기반의 다이어트·운동 전문 콘텐츠 에디터입니다.
독자는 30~50대 직장인으로, 바쁜 일상 속 실질적인 방법을 원합니다.

당신의 글은 다음 절대 규칙을 따릅니다.

[절대 규칙 — 위반 시 글을 처음부터 다시 쓴다]

1. 첫 300자 안에 독자의 진짜 질문을 언급하고 핵심 답의 한 줄 요약을 제시한다.

2. 다음 표현은 절대 쓰지 않는다:
   "꾸준함이 중요", "꾸준히 실천", "본인에게 맞는", "균형 있게",
   "무리하지 않는 선에서", "개인차가 있으므로", "건강에 유의",
   "좋은 방법", "도움이 됩니다", "~하는 것이 좋습니다",
   "실천해 보세요", "성공의 열쇠", "본 글에서는", "본 포스팅에서는"

3. 모든 일반적 조언에 반드시 숫자를 붙인다:
   "충분히" 대신 정확한 g/L/분/회/%
   "적당한" 대신 구체적 범위 (예: 20~25g)

4. 독자의 다음 질문을 선제적으로 답한다. 각 섹션에서
   "그럼 A 상황이면 어떻게?" 같은 분기를 최소 2개 제시한다.

5. IF-THEN 분기를 최소 2개 제공한다. 예: "아침형이면 A, 직장인이면 B"

6. 현실적 기대치를 과장 없이 수치로 제시한다.
   "효과가 있다" 금지, "2주에 0.5~1.5kg" 허용.

7. "이럴 땐 멈춰라" 섹션을 구체 증상 5개 이상으로 명시한다.

8. "전문가와 상담" 같은 책임 회피 구절은 본문에 절대 쓰지 않는다.
   면책은 맨 마지막 박스에서만.

9. FAQ는 본문에서 안 다룬 구체 상황만 넣는다 (본문 요약 금지).

10. 근거 인용은 (발표연도 + 기관/저널 + 핵심 숫자 + 독자 행동)
    4요소를 한 문장에 녹인다.

11. 단락 리듬을 의도적으로 변화시킨다. 짧은 한 줄 → 긴 설명 →
    리스트 → 짧은 정리. 모든 문단이 비슷한 길이면 실패.

12. 글 마지막은 "오늘부터 할 구체적 행동 한 가지"로 마무리한다.
    요약 반복 금지.

13. 분량: 본문 2,500~3,500자. 이 범위를 벗어나면 재작성.

14. 톤: 근거 있는 전문가. 반말 금지, 과도한 존대도 금지.
    "~습니다" 기본, 가끔 "~어요"로 리듬 조절.

이 규칙들은 협상 불가능합니다.`;

// ─── User Prompt 생성 ─────────────────────────────────────────────────────────
function buildUserPrompt(topic, categoryLabel) {
  return `주제: ${topic.title}
메인 키워드: ${topic.keyword}
카테고리: ${categoryLabel || '다이어트·운동'}

이 주제로 독자가 실제로 검색해서 클릭한 이유 — 즉 "이 글에서 반드시 답을 얻어야 하는 질문"을 3~5개 먼저 상상하고, 그 질문들을 모두 해결하는 본문을 작성하세요.

다음 JSON 형식으로만 응답하세요 (코드블록 없이):

{
  "reader_questions": ["독자가 이 글에서 기대하는 구체 질문 3~5개"],
  "hook": "첫 문단 (100~150자, 독자 상황에 직접 말 걸기, 놀라운 수치나 반전 사실로 시작)",
  "lead_answer": "제목이 약속한 답의 한 줄 요약 (50자 이내, 핵심만)",
  "sections": [
    {
      "h2": "섹션 제목 (독자가 실제로 하는 질문 형태로)",
      "body": "본문 마크다운 — ★ 이 필드는 반드시 700자 이상으로 작성. 구체 수치(kg·분·%·회 등) 최소 3개, IF-THEN 분기 최소 1개, 독자 사례 1개 포함. 짧게 쓰면 전체가 실패.",
      "numbers_used": ["이 섹션에 사용한 구체 수치들"],
      "if_then_branches": ["이 섹션에서 제공한 분기 설명들"],
      "image_query": "Pexels 이미지 검색용 영어 키워드 2~3단어"
    }
  ],
  "stop_signals": ["★ 반드시 5개 이상. 구체 증상으로 — '눈앞이 하얘짐', '수면 질 저하 1주 이상' 같은 형태. '몸이 이상하면 중단' 같은 모호한 표현 금지"],
  "realistic_expectations": {
    "time": "언제부터 효과 나타나는지 (구체 기간 + 조건)",
    "magnitude": "얼마나 변화하는지 (반드시 수치 포함)",
    "what_not_to_expect": "기대하면 안 되는 것 (구체적으로)"
  },
  "common_mistakes": ["초보자가 가장 많이 하는 실수 3개 — 구체 행동으로 서술"],
  "today_action": "오늘 당장 할 한 가지 행동 (50자 이내, 지금 바로 실천 가능한 것)",
  "faq": [
    {"q": "본문에서 전혀 다루지 않은 새로운 각도의 질문", "a": "150자 이상 구체 답변"},
    {"q": "본문에서 전혀 다루지 않은 또 다른 질문", "a": "150자 이상 구체 답변"},
    {"q": "세 번째 새로운 각도의 질문", "a": "150자 이상 구체 답변"}
  ],
  "sources": [
    {"year": 2024, "publisher": "기관명 또는 저널명", "key_finding": "핵심 숫자 포함 한 줄 요약", "url": ""},
    {"year": 2023, "publisher": "두 번째 출처", "key_finding": "핵심 내용", "url": ""}
  ]
}

★★★ 분량 규칙 (반드시 준수) ★★★
- sections는 4개 작성
- 각 section의 body는 700자 이상 (총합 2,800자 이상 목표)
- faq는 3개 이상
- stop_signals는 5개 이상
- 이 기준을 못 맞추면 전체가 실패 처리됩니다`;
}

// ─── GPT-4o 호출 ──────────────────────────────────────────────────────────────
async function callGpt(systemPrompt, userPrompt, extra = '') {
  const userContent = extra ? `${userPrompt}\n\n${extra}` : userPrompt;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.75,
    max_tokens: 10000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });
  const raw = res.choices[0].message.content.trim();
  return JSON.parse(raw);
}

// ─── 메인 생성 함수 ────────────────────────────────────────────────────────────
async function generateArticle(topic, categoryLabel) {
  const userPrompt = buildUserPrompt(topic, categoryLabel);

  let article;
  let qualityReport;
  let attempt = 0;

  while (attempt < 3) {
    attempt++;
    const extra = attempt > 1
      ? `⚠️ 이전 응답 품질 미달 (${qualityReport.score}점). 다음 항목을 반드시 보완:\n${qualityReport.failed.map((f) => `- ${f}`).join('\n')}\n섹션 body 분량을 각각 더 길게 작성하세요.`
      : '';

    console.log(`  GPT-4o 호출 (시도 ${attempt}/3)...`);
    article = await callGpt(SYSTEM_PROMPT_V3, userPrompt, extra);

    // 품질 검사
    qualityReport = checkQualityV3(article);
    const bodyLen = (article.sections || []).map((s) => s.body || '').join('').length;
    console.log(`  품질 점수: ${qualityReport.score}점 | 섹션 body: ${bodyLen.toLocaleString()}자`);

    if (qualityReport.failed.length) {
      qualityReport.failed.forEach((f) => console.log(`    ⚠️ ${f}`));
    }

    if (qualityReport.score >= 90) break;
    // 금지어만 문제인 경우(분량·구조는 OK) 재시도 효과가 낮으므로 2회 이상이면 통과
    const nonBannedFails = qualityReport.failed.filter((f) => !f.includes('금지어'));
    if (attempt >= 2 && nonBannedFails.length === 0) {
      console.log('  금지어만 미달 — 2회 이상 시도했으므로 진행');
      break;
    }
    if (attempt < 3) {
      console.log('  재생성 요청...');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return { article, qualityReport };
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== 콘텐츠 생성기 v3 (gpt-4o)${IS_DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  const hasPexels = !!process.env.PEXELS_API_KEY;

  for (let i = 0; i < COUNT; i++) {
    console.log(`\n[${i + 1}/${COUNT}] 주제 조회 중...`);

    let topic;
    try {
      topic = await getNextTopic();
    } catch (e) {
      console.error(`주제 없음: ${e.message}`);
      break;
    }

    console.log(`  주제: "${topic.title}"`);
    console.log(`  키워드: "${topic.keyword}"`);

    const categoryId = await resolveCategoryId(topic.categorySlug);
    const catRecord = await prisma.category.findUnique({ where: { id: categoryId } });
    const categoryLabel = catRecord?.name || '다이어트·운동';

    // 생성
    const { article, qualityReport } = await generateArticle(topic, categoryLabel);

    if (IS_DRY_RUN) {
      console.log('\n  [DRY RUN] 생성 결과 미리보기:');
      console.log(`  hook: ${article.hook?.slice(0, 80)}...`);
      console.log(`  lead_answer: ${article.lead_answer}`);
      console.log(`  sections: ${article.sections?.length}개`);
      console.log(`  stop_signals: ${article.stop_signals?.length}개`);
      console.log(`  faq: ${article.faq?.length}개`);
      console.log(`  quality score: ${qualityReport.score}점`);
      continue;
    }

    // 썸네일 Pexels
    let thumbnail = null;
    if (hasPexels) {
      const thumbQuery = (article.sections?.[0]?.image_query) || `fitness diet healthy`;
      const thumbImg = await fetchPexelsImage(thumbQuery);
      if (thumbImg) thumbnail = thumbImg.url;
    }

    // HTML 조립 (이미지 포함)
    const content = await assembleHtml(article, hasPexels);
    const bodyText = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const readTime = Math.max(1, Math.ceil(bodyText.length / 500));

    // 쿠팡파트너스
    let coupangProductJson = null;
    try {
      const products = await fetchCoupangProducts();
      if (products.length) {
        const p = products[Math.floor(Math.random() * products.length)];
        coupangProductJson = JSON.stringify({ name: p.name, url: p.url, image: p.image, price: p.price, ctaText: '추천 제품 보기' });
      }
    } catch { /* 무시 */ }

    // 키워드 배열
    const kwArray = [topic.keyword, ...(article.reader_questions || []).slice(0, 3)];

    // 발췌
    const excerpt = article.hook?.slice(0, 145) || topic.title;

    // slug
    const slug = generateSlug(article.lead_answer || topic.title);

    // DB 저장
    const post = await prisma.post.create({
      data: {
        title: topic.title,
        slug,
        excerpt,
        content,
        keywords: JSON.stringify(kwArray),
        tags: [topic.keyword, categoryLabel],
        metaTitle: `${topic.title} | 다이어트·운동 백과`,
        metaDescription: excerpt.slice(0, 155),
        status: 'REVIEW_REQUIRED',
        qualityScore: qualityReport.score,
        rejectReasons: qualityReport.failed,
        sources: article.sources || [],
        thumbnail,
        coupangProduct: coupangProductJson,
        readTime,
        categoryId,
        lastUpdatedAt: new Date(),
      },
    });

    console.log(`\n  ✅ 저장 완료 → Post #${post.id} | 품질: ${qualityReport.score}점 | ${bodyText.length}자 | REVIEW_REQUIRED`);

    // Topic / Keyword 상태 업데이트
    if (topic.topicId) {
      await prisma.topic.update({ where: { id: topic.topicId }, data: { status: 'DRAFTED' } }).catch(() => {});
    }
    if (topic.keywordId) {
      await prisma.keyword.update({ where: { id: topic.keywordId }, data: { used: true } }).catch(() => {});
    }

    // API 쿨다운
    if (i < COUNT - 1) await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('\n=== 완료 ===');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
