export type CategoryId =
  | 'diet'
  | 'exercise'
  | 'hometraining'
  | 'running'
  | 'nutrition'
  | 'supplement'
  | 'health'
  | 'beauty'
  | 'skincare'
  | 'motivation';

export type AccentColor = 'coral' | 'sage' | 'rose';

export interface CategoryMeta {
  id: CategoryId;
  slug: string;
  label: string;
  accent: AccentColor;
  order: number;
  description: string;
  keywords: string[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'diet',
    slug: 'diet',
    label: '다이어트',
    accent: 'coral',
    order: 1,
    description: '과학 근거 기반의 체중 감량 · 지방 연소 · 간헐적 단식 정보',
    keywords: ['체중감량', '지방연소', '간헐적단식', '다이어트'],
  },
  {
    id: 'exercise',
    slug: 'exercise',
    label: '운동·헬스',
    accent: 'coral',
    order: 2,
    description: '근력운동 · 분할운동 · 스쿼트 등 헬스 가이드',
    keywords: ['근력운동', '헬스', '웨이트', '근육', '스쿼트'],
  },
  {
    id: 'hometraining',
    slug: 'hometraining',
    label: '홈트레이닝',
    accent: 'coral',
    order: 3,
    description: '집에서 하는 맨몸운동 · 30일 챌린지 · 홈트 루틴',
    keywords: ['홈트', '홈트레이닝', '맨몸운동', '30일챌린지'],
  },
  {
    id: 'running',
    slug: 'running',
    label: '러닝·유산소',
    accent: 'coral',
    order: 4,
    description: '러닝 입문 · 10km 도전 · 페이스 관리 가이드',
    keywords: ['러닝', '달리기', '조깅', '유산소', '10km'],
  },
  {
    id: 'nutrition',
    slug: 'nutrition',
    label: '식단·영양',
    accent: 'sage',
    order: 5,
    description: '탄단지 비율 · 칼로리 계산 · 건강 식단 설계',
    keywords: ['식단', '영양', '탄단지', '칼로리', '건강식단'],
  },
  {
    id: 'supplement',
    slug: 'supplement',
    label: '영양제·이너뷰티',
    accent: 'sage',
    order: 6,
    description: '종합비타민 · 콜라겐 · 프로바이오틱스 이너뷰티 정보',
    keywords: ['영양제', '이너뷰티', '종합비타민', '콜라겐', '프로바이오틱스'],
  },
  {
    id: 'health',
    slug: 'health',
    label: '생활건강',
    accent: 'sage',
    order: 7,
    description: '수면 · 스트레스 · 혈압 · 장건강 생활 습관 정보',
    keywords: ['수면', '스트레스', '혈압', '장건강', '생활습관'],
  },
  {
    id: 'skincare',
    slug: 'skincare',
    label: '스킨케어',
    accent: 'rose',
    order: 8,
    description: '여드름 · 각질 · 민감성 피부 스킨케어 루틴',
    keywords: ['여드름', '각질', '민감성피부', '토너', '앰플'],
  },
  {
    id: 'beauty',
    slug: 'beauty',
    label: '뷰티·메이크업',
    accent: 'rose',
    order: 9,
    description: '화장품 성분 분석 · 쿠션 · 립 메이크업 가이드',
    keywords: ['화장품', '성분', '쿠션', '립', '메이크업'],
  },
  {
    id: 'motivation',
    slug: 'motivation',
    label: '바디프로필·동기',
    accent: 'coral',
    order: 10,
    description: '바디프로필 준비 · 운동 습관 · 챌린지 동기 부여',
    keywords: ['바디프로필', '운동동기', '습관', '챌린지'],
  },
] as const;

export const categoryById = (id: CategoryId): CategoryMeta =>
  CATEGORIES.find((c) => c.id === id)!;

export const categoryBySlug = (slug: string): CategoryMeta | undefined =>
  CATEGORIES.find((c) => c.slug === slug);

/** Old slug → new slug redirect map (for next.config.js) */
export const LEGACY_REDIRECTS: Record<string, string> = {
  weightloss: 'diet',
  strength:   'exercise',
  cardio:     'running',
};
