import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: '건강·의학',
    slug: 'health',
    description: '건강 정보, 질병 예방, 영양, 운동, 의학 상식',
  },
  {
    name: 'IT·테크',
    slug: 'tech',
    description: '기술 트렌드, 앱, 소프트웨어, AI, 스마트폰',
  },
  {
    name: '경제·재테크',
    slug: 'economy',
    description: '투자, 주식, 부동산, 절세, 재테크 방법',
  },
  {
    name: '생활정보',
    slug: 'lifestyle',
    description: '일상 꿀팁, 요리, 청소, 인테리어, 육아',
  },
  {
    name: '여행·문화',
    slug: 'travel',
    description: '국내외 여행, 관광지, 음식점, 문화 행사',
  },
];

const seedKeywords: Record<string, string[]> = {
  health: [
    '혈당 낮추는 음식',
    '콜레스테롤 정상수치',
    '수면 부족 증상',
    '면역력 높이는 방법',
    '무릎 통증 원인',
    '갑상선 기능저하증 증상',
    '당뇨병 초기 증상',
    '고혈압 낮추는 법',
    '체중 감량 빠른 방법',
    '피부 트러블 없애는 방법',
  ],
  tech: [
    'ChatGPT 활용법',
    '아이폰 배터리 오래 쓰는 법',
    '유튜브 수익 창출 조건',
    '쿠팡파트너스 가입 방법',
    '구글 애드센스 신청',
    'AI 이미지 생성 사이트',
    '노트북 느릴 때 해결법',
    '유튜브 알고리즘 원리',
    '스마트폰 데이터 절약',
    '갤럭시 꿀팁 모음',
  ],
  economy: [
    '주식 투자 입문',
    'ISA 계좌 개설 방법',
    '청년 적금 금리 비교',
    '연말정산 환급 방법',
    '부동산 청약 조건',
    '비상금 얼마가 적당',
    '연금저축 세액공제',
    '직장인 부업 추천',
    '소득세 절세 방법',
    '금 투자 방법 종류',
  ],
  lifestyle: [
    '냉장고 냄새 없애는 법',
    '전기요금 절약 방법',
    '집 청소 효율적으로 하는 법',
    '손쉬운 레시피 모음',
    '분리수거 방법 헷갈리는 것들',
    '다이어트 식단 구성',
    '실내 식물 키우기 쉬운 것',
    '아이 공부 습관 만들기',
    '커피 머신 세척 방법',
    '겨울 난방비 줄이는 법',
  ],
  travel: [
    '제주도 숨은 여행지',
    '국내 당일치기 여행',
    '강릉 가볼 만한 곳',
    '일본 자유여행 준비',
    '동남아 여행 추천지',
    '여행 짐 싸는 방법',
    '호텔 저렴하게 예약',
    '서울 주말 나들이',
    '가족여행 코스 추천',
    '겨울 국내 여행지',
  ],
};

async function main() {
  console.log('시드 데이터 생성 시작...');

  // 카테고리 생성
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });

    // 키워드 생성
    const keywords = seedKeywords[cat.slug] || [];
    for (const kw of keywords) {
      await prisma.keyword.upsert({
        where: { keyword: kw },
        update: {},
        create: {
          keyword: kw,
          categoryId: category.id,
          priority: Math.floor(Math.random() * 5) + 1,
          searchVolume: Math.floor(Math.random() * 50000) + 1000,
          competition: Math.random() * 0.5, // 낮은 경쟁도
        },
      });
    }

    console.log(`  ✓ ${cat.name} 카테고리 + ${keywords.length}개 키워드 생성`);
  }

  // 사이트 기본 설정
  const defaultConfigs = [
    { key: 'site_name', value: 'Smart Info Blog' },
    { key: 'site_description', value: '유용한 정보와 생활 꿀팁을 제공하는 블로그' },
    { key: 'site_url', value: 'https://yourdomain.com' },
    { key: 'daily_post_limit', value: '3' },
    { key: 'publish_start_hour', value: '9' },
    { key: 'publish_end_hour', value: '21' },
    { key: 'adsense_client_id', value: '' },
    { key: 'ga_measurement_id', value: '' },
  ];

  for (const config of defaultConfigs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('\n✅ 시드 데이터 생성 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
