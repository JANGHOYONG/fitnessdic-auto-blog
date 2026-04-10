# 다이어트·운동 백과 - 블로그 자동화 프로젝트

> ⚠️ 이 프로젝트는 **시니어 건강백과(smartinfoblog.co.kr)** 의 코드를 기반으로 새로 구축하는 프로젝트입니다.
> 기존 프로젝트 경로: `/Users/janghoyong/BLOG AUTO`
> 기존 코드를 복사해서 시작하므로 구조가 동일합니다.

---

## 프로젝트 개요
- **사이트명**: 다이어트·운동 백과 (도메인 미정 → 구매 후 입력)
- **타겟**: 30~50대 다이어트·운동 정보 블로그
- **스택**: Next.js 14 App Router · Prisma ORM · Neon PostgreSQL · Vercel
- **자동화**: GitHub Actions (블로그 5개/일 · 쇼츠 1개/일 · 롱폼 1개/일)
- **수익화**: 애드센스 + 쿠팡파트너스(단백질·운동기구·다이어트식품) + 유튜브

---

## ✅ 초기 세팅 체크리스트 (처음 시작할 때 순서대로)

- [ ] 1. 기존 레포(`blog-auto`) fork 또는 새 GitHub 레포 생성
- [ ] 2. 도메인 구매 (예: fitnessdic.co.kr 등)
- [ ] 3. Neon PostgreSQL 새 프로젝트 생성 → DATABASE_URL 확보
- [ ] 4. Vercel 새 프로젝트 연결 → 도메인 연결
- [ ] 5. YouTube 새 채널 생성 → OAuth2 토큰 재발급
- [ ] 6. GitHub Secrets 등록 (아래 목록 참고)
- [ ] 7. DB 초기화 (`npx prisma migrate deploy`)
- [ ] 8. 주제 배열 교체 (`HEALTH_TOPICS` → `FITNESS_TOPICS`)
- [ ] 9. GPT 시스템 역할 교체 (헬스트레이너/영양사)
- [ ] 10. 디자인 테마 변경 (그린 → 오렌지/레드 계열)
- [ ] 11. 브랜딩 변경 (🏥 → 💪)
- [ ] 12. 첫 번째 글 수동 발행 테스트

---

## 핵심 아키텍처

### 자동화 파이프라인 (기존과 동일)
```
[GitHub Actions 스케줄]
  09:00 KST → auto-publish.yml → 블로그 글 생성·발행
  13:00 KST → auto-publish.yml → 블로그 글 생성·발행
  17:00 KST → auto-publish.yml → 블로그 글 생성·발행
  21:00 KST → auto-publish.yml → 블로그 글 생성·발행
  01:00 KST → auto-publish.yml → 블로그 글 생성·발행

  09:30 KST → longform-auto.yml → 롱폼 유튜브 생성·업로드 (1개/일)
  10:00 KST → shorts-auto.yml  → 쇼츠 유튜브 생성·업로드 (1개/일)
```

### 워크플로우 파일 (파일명 동일, 내용만 수정)
| 파일 | 역할 |
|------|------|
| `.github/workflows/auto-publish.yml` | 블로그 글 생성+발행 (5회/일) |
| `.github/workflows/shorts-auto.yml` | 쇼츠 생성+YouTube 업로드 (1회/일) |
| `.github/workflows/longform-auto.yml` | 롱폼 생성+YouTube 업로드 (1회/일) |
| `.github/workflows/collect-keywords.yml` | 키워드 수동 수집 |

### 핵심 스크립트
| 파일 | 역할 |
|------|------|
| `scripts/content-generator.js` | GPT-4o-mini로 블로그 글 생성 (Pexels 이미지 포함) |
| `scripts/publisher.js` | DRAFT → PUBLISHED 상태 전환 |
| `scripts/keyword-collector.js` | 운동 7대 주제별 키워드 수집 |
| `scripts/shorts-generator.js` | 쇼츠 영상 생성 (이미지 슬라이드 5장 × 10초) |
| `scripts/longform-generator.js` | 롱폼 영상 생성 (7챕터 × ~60초) |

---

## 다이어트·운동 7대 주제 (네비게이션 순서 = 발행 순환 순서)
```
체중감량 → 근력운동 → 유산소·러닝 → 식단·영양
→ 홈트레이닝 → 다이어트 식품 → 바디프로필·동기 → 반복
```

### `content-generator.js`에서 교체할 코드
```javascript
// 기존 HEALTH_TOPICS 배열을 아래로 교체
const FITNESS_TOPICS = [
  { id: 'weightloss', label: '체중감량',      words: ['체중감량', '살빼기', '지방연소', '다이어트'] },
  { id: 'strength',   label: '근력운동',      words: ['근력운동', '헬스', '웨이트', '근육'] },
  { id: 'cardio',     label: '유산소·러닝',   words: ['유산소', '러닝', '달리기', '조깅'] },
  { id: 'nutrition',  label: '식단·영양',     words: ['식단', '영양', '단백질', '칼로리'] },
  { id: 'hometraining', label: '홈트레이닝', words: ['홈트', '홈트레이닝', '맨몸운동'] },
  { id: 'supplement', label: '다이어트 식품', words: ['단백질보충제', '다이어트식품', '영양제'] },
  { id: 'motivation', label: '바디프로필·동기', words: ['바디프로필', '운동동기', '습관'] },
];

// GPT 시스템 역할
const SYSTEM_ROLE = '당신은 10년 경력의 국가공인 생활스포츠지도사이자 스포츠영양사입니다. ' +
  '과학적 근거 기반의 다이어트·운동 정보를 30~50대 일반인이 이해하기 쉽게 전달합니다. ' +
  '섣부른 효과 보장은 하지 않으며, 개인차가 있음을 항상 명시합니다.';
```

---

## 프론트엔드 디자인 시스템 (변경 필요)

### 색상 테마: 에너지 오렌지
```css
/* globals.css에서 교체 */
--bg: #FFF8F3;
--primary: #E8631A;
--primary-dark: #C4501A;
--text: #2D1A0E;
--border: #F5D5B8;
--bg-bar: #FDEEE0;
```

### 브랜딩
- **아이콘**: 💪
- **사이트명**: 다이어트·운동 백과
- **슬로건**: 30·40·50대를 위한 과학적 다이어트·운동 가이드
- **파비콘**: `src/app/icon.tsx` 색상을 오렌지 그라디언트로 교체

---

## 외부 API 연동 (기존 키 재사용 가능)
| API | 용도 | 재사용 여부 |
|-----|------|------------|
| OpenAI GPT-4o-mini | 블로그 글·영상 스크립트 생성 | ✅ 동일 키 사용 |
| Google TTS `ko-KR-Standard-C` | 영상 한국어 성우 | ✅ 동일 키 사용 |
| Pexels Photo API | 블로그+영상 이미지 | ✅ 동일 키 사용 |
| YouTube Data API v3 | 영상 업로드 | ⚠️ 새 채널 → 새 OAuth 토큰 필요 |
| Neon PostgreSQL | DB | ⚠️ 새 프로젝트 생성 필요 |

---

## GitHub Secrets 목록
```
DATABASE_URL           - 새 Neon PostgreSQL 연결 문자열 (신규)
OPENAI_API_KEY         - 기존과 동일
GOOGLE_TTS_API_KEY     - 기존과 동일
PEXELS_API_KEY         - 기존과 동일
YOUTUBE_CLIENT_ID      - 새 채널용 재발급 필요
YOUTUBE_CLIENT_SECRET  - 새 채널용 재발급 필요
YOUTUBE_REFRESH_TOKEN  - 새 채널용 재발급 필요
NEXT_PUBLIC_SITE_URL   - https://새도메인.co.kr
REVALIDATE_SECRET      - 새로 생성 (아무 랜덤 문자열)
```

---

## 영상 제작 스펙 (기존과 동일)
### 쇼츠 (`shorts-generator.js`)
- 해상도: 1080×1920 (세로형)
- 구성: 5슬라이드 × ~10초 = 50초 이내
- 이미지: Pexels Portrait 사진 (운동하는 사람 키워드)
- 오버레이: 상단 브랜드 배지 + 하단 내레이션 자막 + 진행 바
- TTS: Google TTS `ko-KR-Standard-C`, speakingRate 0.90

### 롱폼 (`longform-generator.js`)
- 해상도: 1080×1920 (세로형)
- 구성: 7챕터 × ~60초
- 챕터 구조: 훅→문제제기→원인분석→해결법→주의사항→즉시실천→마무리
- TTS: Google TTS `ko-KR-Standard-C`, speakingRate 0.90

---

## 쿠팡파트너스 연동 (수익화 핵심)
다이어트 블로그는 쿠팡파트너스 수익이 건강 블로그보다 높습니다.

### 추천 상품 카테고리
```
단백질 보충제 → 다이어트 식품 → 운동기구(홈트용)
→ 운동복·신발 → 체중계·스마트밴드 → 영양제
```

### 배너 노출 위치
- 글 중간 (`CoupangDynamicBanner` 컴포넌트 재사용)
- 카테고리별 맞춤 배너 (체중감량 글 → 다이어트 식품 배너)

---

## 기존 프로젝트에서 이어받은 해결된 이슈들
> 이미 해결된 버그들 — 코드 복사 시 그대로 적용됨

| 이슈 | 해결책 |
|------|--------|
| FFmpeg 오류 234 | fade를 complexFilter 안으로 이동 |
| GPT가 글자수 힌트를 그대로 출력 | `narration`+`imageQuery`만 요청 |
| 영어 음성 나옴 | Google TTS `ko-KR-Standard-C` 사용 |
| 영상 끊김 | 정지 이미지 + `-loop 1 -framerate 25` |
| 특정 주제만 계속 발행 | 7대 주제 엄격 로테이션 |
| 블로그 이미지 없음 | Pexels API 사용 |
| 쇼츠/롱폼 동시 실행 충돌 | 각각 cron 스케줄로 분리 |
| YouTube 업로드 한도 초과 | 쇼츠+롱폼 각 1개/일로 제한 |
| DB 쿼리 빌드타임 오류 | Prisma 쿼리 try-catch 래핑 |
| 모바일 이미지 placeholder | 이미지 없을 때 빈 div 대신 null 반환 |

---

## 콘텐츠 글 스펙
- **글 길이**: 1,800~2,500자 (너무 길면 완독률 저하)
- **섹션 수**: 4개 (도입-본문2개-마무리)
- **각 섹션**: 300~400자
- **FAQ**: 2개
- **max_tokens**: 5,000

---

## PWA (앱처럼 저장) 기능
헤더에 "📲 앱 다운로드" 버튼 포함 — OS별 안내 팝업

| OS | 동작 |
|----|------|
| iOS Safari | 링크복사 → 공유버튼⬆️ → 홈 화면에 추가 |
| Android Chrome | beforeinstallprompt → 네이티브 설치 |
| Android 기타 | 브라우저에서 "홈 화면에 추가" 안내 |

---

## 주요 컴포넌트 목록
| 컴포넌트 | 역할 |
|----------|------|
| `Header.tsx` | 상단 네비 + 모바일 메뉴 + 앱 다운로드 버튼 |
| `Footer.tsx` | 하단 링크 + 앱 다운로드 버튼 |
| `ArticleCard.tsx` | 글 목록 카드 (lazy loading) |
| `DailyHealthTip.tsx` | 오늘의 운동 궁금증 위젯 (→ DailyFitnessTip으로 이름 변경) |
| `AdSense.tsx` | 광고 (미설정 시 null 반환) |
| `CoupangDynamicBanner.tsx` | 쿠팡파트너스 배너 |
| `NewsletterCTA.tsx` | 뉴스레터 구독 CTA |
| `TopBar.tsx` | 방문자수 + 인기글 바 |
| `AddToHomeScreen.tsx` | PWA 설치 안내 (Footer용) |

---

## 참고: 시니어 건강백과와 다른 점 요약
| 항목 | 시니어 건강백과 | 다이어트·운동 백과 |
|------|--------------|----------------|
| 타겟 | 50~60대 | 30~50대 |
| 주제 | 건강 7대 주제 | 운동·다이어트 7대 주제 |
| 색상 | 메디컬 그린 | 에너지 오렌지 |
| 아이콘 | 🏥 | 💪 |
| 쿠팡 주력 | 건강기능식품 | 단백질·운동기구 |
| DB | Neon (기존) | Neon (신규) |
| YouTube | 기존 채널 | 새 채널 |

---
*생성일: 2026-04-10 | 기반 프로젝트: smartinfoblog.co.kr*
