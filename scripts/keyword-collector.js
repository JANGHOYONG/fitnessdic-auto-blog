/**
 * 키워드 수집 스크립트 (GPT-4o-mini)
 * 실행: node scripts/keyword-collector.js
 * 옵션: --category=tech --count=20
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
const targetCategory = getArg('category');
const targetCount = parseInt(getArg('count') || '20');

function parseJson(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('JSON 파싱 실패');
  return JSON.parse(match[1]);
}

// ─── 계절성 키워드 (현재 월 기준 자동 선택) ───────────────────────────────────
const SEASONAL_KEYWORDS = {
  spring: { // 3~5월
    label: '봄',
    keywords: [
      '봄 다이어트 시작하는 법', '봄철 야외 달리기 주의사항', '봄 환절기 운동 면역력',
      '봄 나들이 칼로리 소모 운동', '봄에 살 빠지는 이유', '봄 단기 다이어트 식단',
      '봄 등산 초보자 주의사항', '벚꽃 시즌 체중 관리 팁', '봄 알레르기 있어도 할 수 있는 운동',
    ],
  },
  summer: { // 6~8월
    label: '여름',
    keywords: [
      '여름 다이어트 식단 짜는 법', '무더위 실내 운동 루틴', '여름 수영 다이어트 효과',
      '여름 휴가 전 복근 만들기', '폭염 헬스장 운동 주의사항', '여름 단백질 보충제 섭취법',
      '여름철 야외 운동 탈수 예방', '냉방병과 근육통 관계', '여름 체중 증가 원인',
    ],
  },
  autumn: { // 9~11월
    label: '가을',
    keywords: [
      '가을 마라톤 초보 준비법', '선선한 날씨 야외 운동 루틴', '가을 다이어트 골든타임',
      '추석 연휴 살 안 찌는 방법', '가을 바디프로필 준비 식단', '가을철 체중 감량 팁',
      '겨울 대비 근육 쌓는 가을 루틴', '가을 조깅 초보 거리 늘리기', '추석 음식 칼로리 소모 운동',
    ],
  },
  winter: { // 12~2월
    label: '겨울',
    keywords: [
      '겨울 실내 운동 루틴 초보', '연말 폭식 후 다이어트 리셋', '겨울 체중 증가 원인과 해결',
      '설날 음식 칼로리 줄이는 법', '겨울 홈트레이닝 기구 추천', '추운 날씨 달리기 옷차림',
      '겨울 기초대사량 높이는 법', '새해 다이어트 작심삼일 극복', '겨울 체지방 감량 운동',
    ],
  },
};

function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1~12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// 운동·다이어트 7대 주제 (fitness 카테고리)
const HEALTH_SUBTOPICS = [
  { id: 'weightloss',   label: '체중감량',        guide: '체중감량, 지방연소, 다이어트 식단, 살빼기, 체지방 줄이는 법, 요요 방지, 간헐적 단식 등' },
  { id: 'strength',     label: '근력운동',        guide: '헬스, 웨이트트레이닝, 스쿼트, 데드리프트, 벤치프레스, 근비대, 근육 키우는 법, 분할 루틴 등' },
  { id: 'cardio',       label: '유산소·러닝',     guide: '달리기, 조깅, 자전거, 수영, 유산소 운동, 지방 연소, 심폐 기능, 마라톤 입문 등' },
  { id: 'nutrition',    label: '식단·영양',       guide: '다이어트 식단, 단백질 섭취, 칼로리 계산, 탄수화물 조절, 헬스 식단, 영양소 균형, 끼니 구성 등' },
  { id: 'hometraining', label: '홈트레이닝',      guide: '홈트, 맨몸운동, 집에서 운동, 플랭크, 버피, 푸시업, 스쿼트 집에서, 운동기구 없이 등' },
  { id: 'supplement',   label: '다이어트 식품',   guide: '단백질 보충제, 프로틴, 다이어트 식품, 크레아틴, BCAA, 영양제, 체중감량 보조제, 헬스 보충제 등' },
  { id: 'motivation',   label: '바디프로필·동기', guide: '바디프로필, 운동 습관, 운동 동기, 다이어트 루틴, 몸만들기, 눈바디, 운동일지, 헬스장 처음 등' },
];

// 운동지식 추가 주제 (knowledge 카테고리)
const KNOWLEDGE_SUBTOPICS = [
  { id: 'weightloss',   label: '체중감량 심화',   guide: '체지방률, 인슐린 저항성과 다이어트, 대사증후군, 체중 정체기 돌파, 지방 타입별 감량법 등' },
  { id: 'strength',     label: '근력운동 심화',   guide: '근섬유 유형, 운동 후 회복, 오버트레이닝 징후, 운동 프로그래밍, 부상 예방 등' },
  { id: 'cardio',       label: '유산소 심화',     guide: '최대산소섭취량(VO2max), 심박수 구간 훈련, HIIT vs 저강도 유산소, 인터벌 트레이닝 등' },
  { id: 'nutrition',    label: '스포츠 영양 심화', guide: '운동 전후 영양 타이밍, 탄수화물 로딩, 단백질 합성 메커니즘, 수분 전해질 보충 등' },
];

async function collectKeywordsForSubtopic(categoryName, subtopic, count) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.85,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '당신은 한국 네이버·구글 검색 SEO 전문가입니다. 경쟁이 낮은 틈새 롱테일 키워드만 발굴합니다. 반드시 JSON 형식으로만 응답하세요.',
      },
      {
        role: 'user',
        content: `30~50대 다이어트·운동 블로그의 [${subtopic.label}] 주제로 검색의도가 명확한 발견형 키워드 ${count}개를 생성해주세요.

주제 범위: ${subtopic.guide}

━━━ 핵심 철학: 키워드 = 하나의 구체적 발견/주장 ━━━
키워드 자체가 "이걸 왜 몰랐지?" 라는 반응을 유발해야 합니다.

✅ 반드시 이 4가지 패턴을 골고루 섞어 생성:

[패턴 1 — 반전형] 사람들이 믿는 것과 반대되는 사실
예시:
- "유산소 열심히 해도 살 안 빠지는 40대 여성의 공통점"
- "닭가슴살만 먹는데 근육이 안 느는 진짜 이유"
- "스쿼트 매일 해도 허벅지 근육이 안 생기는 사람의 실수"
- "칼로리 줄여도 체중이 안 빠지는 30대의 호르몬 문제"

[패턴 2 — 메커니즘형] 몸 안에서 일어나는 구체적 원리
예시:
- "식후 30분 안에 운동하면 지방보다 근육이 타는 이유"
- "공복 유산소가 지방을 더 태운다는 것이 사실인 조건"
- "40대 이후 같은 운동을 해도 근육이 덜 생기는 생물학적 원인"

[패턴 3 — 비교/차이형] 같은 상황에서 결과가 다른 이유
예시:
- "같은 운동 루틴인데 한 명은 살 빠지고 한 명은 안 빠지는 차이"
- "단백질 100g 먹어도 근육이 안 느는 사람과 잘 느는 사람의 차이"

[패턴 4 — 구체적 수치/조건형]
예시:
- "체지방 30% 이상인 40대가 유산소보다 먼저 해야 할 것"
- "하루 1만보 걸어도 체중이 그대로인 이유와 진짜 방법"

❌ 절대 금지:
- 2어절 이하 단순 키워드 ("다이어트 방법", "살 빼기")
- 뻔한 정보형 ("운동 꾸준히", "단백질 많이")
- 현재 연도 포함 키워드

JSON 형식:
{
  "keywords": [
    { "keyword": "유산소 열심히 해도 살 안 빠지는 40대 여성의 공통점", "pattern": "반전형", "priority": 1, "estimatedVolume": 1200 }
  ]
}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

async function collectKeywords(categoryName, count) {
  // 운동지식 카테고리: 주제별 균등 수집
  if (categoryName === '운동지식' || categoryName.toLowerCase() === 'knowledge') {
    const perTopic = Math.ceil(count / KNOWLEDGE_SUBTOPICS.length);
    const allKeywords = [];
    for (const subtopic of KNOWLEDGE_SUBTOPICS) {
      console.log(`    [${subtopic.label}] 키워드 ${perTopic}개 수집...`);
      try {
        const { keywords } = await collectKeywordsForSubtopic(categoryName, subtopic, perTopic);
        allKeywords.push(...keywords);
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`    [${subtopic.label}] 실패: ${e.message}`);
      }
    }
    return { keywords: allKeywords };
  }

  // 비운동 카테고리는 기존 방식 사용
  if (!categoryName.includes('운동') && !categoryName.includes('다이어트') && !categoryName.includes('fitness') && categoryName.toLowerCase() !== 'health' && categoryName.toLowerCase() !== 'fitness') {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: '당신은 한국 검색 SEO 전문가입니다. 반드시 JSON 형식으로만 응답하세요.' },
        {
          role: 'user',
          content: `"${categoryName}" 카테고리의 한국어 롱테일 키워드 ${count}개를 추천해주세요.
조건: 월 검색량 500~5,000, 최소 3어절 이상, 정보성·증상·비교 형식
JSON: { "keywords": [{ "keyword": "키워드", "priority": 1, "estimatedVolume": 2000 }] }`,
        },
      ],
    });
    return JSON.parse(response.choices[0].message.content);
  }

  // 운동·다이어트 카테고리: 7대 주제별 균등 수집
  const perTopic = Math.ceil(count / HEALTH_SUBTOPICS.length);
  const allKeywords = [];

  for (const subtopic of HEALTH_SUBTOPICS) {
    console.log(`    [${subtopic.label}] 키워드 ${perTopic}개 수집...`);
    try {
      const { keywords } = await collectKeywordsForSubtopic(categoryName, subtopic, perTopic);
      allKeywords.push(...keywords);
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`    [${subtopic.label}] 실패: ${e.message}`);
    }
  }

  return { keywords: allKeywords };
}

// ─── 계절성 키워드 DB 저장 ──────────────────────────────────────────────────────
async function saveSeasonalKeywords(healthCategoryId) {
  const season = getCurrentSeason();
  const seasonal = SEASONAL_KEYWORDS[season];
  console.log(`\n🌸 계절성 키워드 주입 [${seasonal.label}] — ${seasonal.keywords.length}개`);

  let saved = 0;
  for (const keyword of seasonal.keywords) {
    try {
      await prisma.keyword.upsert({
        where: { keyword },
        update: { priority: 1 }, // 계절성은 최우선 순위
        create: {
          keyword,
          categoryId: healthCategoryId,
          priority: 1,
          searchVolume: 5000,
          competition: 0.2,
          used: false,
        },
      });
      saved++;
    } catch (e) {
      // 중복 등 무시
    }
  }
  console.log(`  ✅ ${saved}개 저장 완료`);
}

async function main() {
  console.log('=== 키워드 수집 시작 (GPT-4o-mini) ===');

  try {
    const categories = await prisma.category.findMany();
    const targets = targetCategory
      ? categories.filter((c) => c.slug === targetCategory)
      : categories;

    let totalSaved = 0;

    for (const cat of targets) {
      console.log(`\n[${cat.name}] 키워드 ${targetCount}개 수집 중...`);

      try {
        const FITNESS_SUBTOPIC_BY_SLUG = Object.fromEntries(HEALTH_SUBTOPICS.map((t) => [t.id, t]));
        let keywords;
        const directSubtopic = FITNESS_SUBTOPIC_BY_SLUG[cat.slug];
        if (directSubtopic) {
          const result = await collectKeywordsForSubtopic(cat.name, directSubtopic, targetCount);
          keywords = result.keywords;
        } else {
          const result = await collectKeywords(cat.name, targetCount);
          keywords = result.keywords;
        }
        let saved = 0;

        for (const kw of keywords) {
          try {
            await prisma.keyword.upsert({
              where: { keyword: kw.keyword },
              update: { priority: kw.priority },
              create: {
                keyword: kw.keyword,
                categoryId: cat.id,
                priority: kw.priority || 3,
                searchVolume: kw.estimatedVolume || null,
                competition: Math.random() * 0.4,
                used: false,
              },
            });
            saved++;
          } catch (_) {}
        }

        totalSaved += saved;
        console.log(`  ✓ ${saved}개 저장`);
      } catch (e) {
        console.error(`  ✗ ${cat.name} 실패: ${e.message}`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    // 계절성 키워드 주입 (health 카테고리에만)
    const healthCat = categories.find((c) => c.slug === 'health');
    if (healthCat) {
      await saveSeasonalKeywords(healthCat.id);
    }

    await prisma.automationLog.create({
      data: {
        type: 'KEYWORD_COLLECT',
        status: 'SUCCESS',
        message: `키워드 ${totalSaved}개 수집 완료 (GPT-4o-mini, 계절성 포함)`,
      },
    });

    console.log(`\n✅ 총 ${totalSaved}개 키워드 수집 완료 (계절성 포함)`);
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
