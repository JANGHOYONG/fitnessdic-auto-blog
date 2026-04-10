import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: '체중감량·다이어트',
    slug: 'health',
    description: '체중감량, 지방연소, 다이어트 식단, 요요 방지 정보',
  },
  {
    name: '근력운동·헬스',
    slug: 'fitness',
    description: '웨이트트레이닝, 근비대, 스쿼트·데드리프트·벤치프레스 가이드',
  },
  {
    name: '유산소·러닝',
    slug: 'cardio',
    description: '달리기, 조깅, 자전거, 유산소 운동, 마라톤 입문',
  },
  {
    name: '식단·영양',
    slug: 'nutrition',
    description: '다이어트 식단, 단백질·칼로리 계산, 운동 전후 영양',
  },
  {
    name: '홈트레이닝',
    slug: 'hometraining',
    description: '집에서 하는 맨몸운동, 홈트 루틴, 기구 없이 운동하기',
  },
];

const seedKeywords: Record<string, string[]> = {
  health: [
    '40대 여성 뱃살 빼는 운동 순서',
    '체중 정체기 돌파하는 방법',
    '간헐적 단식 처음 시작하는 법',
    '지방연소 최적 심박수 계산',
    '요요 없이 살 빼는 원칙',
    '내장지방 빠르게 줄이는 운동',
    '다이어트 중 근육 유지하는 법',
    '30대 남성 체지방 줄이는 루틴',
    '저칼로리 식단 부작용과 해결법',
    '체중감량 속도 적정 기준',
  ],
  fitness: [
    '스쿼트 처음 배우는 자세 교정',
    '데드리프트 허리 안 다치는 법',
    '헬스 초보 3개월 루틴 완성',
    '근육통 없어도 운동 효과 있나',
    '벤치프레스 중량 늘리는 방법',
    '단백질 먹는 타이밍 언제가 좋나',
    '운동 후 회복 빠르게 하는 법',
    '분할 운동 3일 루틴 짜는 방법',
    '근력운동 빈도 얼마나 하는게 적당',
    '오버트레이닝 증상 확인하는 법',
  ],
  cardio: [
    '달리기 처음 시작하는 거리와 속도',
    '지방 연소 걷기 vs 달리기 차이',
    '공복 유산소 진짜 효과 있나',
    '심박수 구간별 운동 효과 차이',
    '러닝화 고르는 기준 초보자용',
    '마라톤 5km 입문 훈련 계획',
    '유산소 운동 얼마나 해야 살 빠지나',
    '인터벌 트레이닝 초보 방법',
    '자전거 다이어트 효과 극대화',
    '수영 다이어트 칼로리 소모량',
  ],
  nutrition: [
    '다이어트 하루 단백질 섭취량 계산',
    '운동 전 먹으면 안 되는 음식',
    '닭가슴살 말고 단백질 식품 추천',
    '탄수화물 줄이면 생기는 부작용',
    '칼로리 계산 앱 정확도 믿어도 되나',
    '다이어트 식단 외식할 때 선택법',
    '단백질 쉐이크 언제 먹는게 좋나',
    '체중감량 식단 짜는 방법 초보',
    '운동 후 탄수화물 먹어야 하는 이유',
    '지방 줄이는 식단 실천 핵심',
  ],
  hometraining: [
    '홈트 처음 시작하는 루틴 30분',
    '기구 없이 복근 만드는 운동',
    '집에서 하는 전신 다이어트 운동',
    '플랭크 매일 하면 생기는 변화',
    '홈트 효과 없는 이유와 해결',
    '맨몸 스쿼트 100개 효과 있나',
    '버피 운동 초보 따라하는 법',
    '집에서 허벅지 살 빼는 운동',
    '운동 매트 없이 홈트 하는 법',
    '30분 홈트 칼로리 소모량',
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
