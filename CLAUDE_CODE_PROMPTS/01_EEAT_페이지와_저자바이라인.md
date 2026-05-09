# 01 · E-E-A-T 페이지와 저자 바이라인 구축

## 🎯 목표

구글 애드센스·네이버 서치어드바이저의 "저품질" 판정에서 탈출하기 위한 **신뢰성(E-E-A-T) 기반 페이지**를 만들고, 모든 글에 **저자 바이라인과 출처**가 표기될 수 있도록 DB 스키마를 확장한다.

YMYL(다이어트·건강·피부미용) 영역에서 AdSense 심사는 저자 신뢰성과 회사 정보 투명성을 1순위로 본다. 이 단계를 건너뛰면 어떤 SEO 최적화도 효과가 없다.

---

## 📂 수정/생성할 파일

| 경로 | 작업 |
|------|------|
| `src/app/about/page.tsx` | 신규 — 회사 소개 |
| `src/app/privacy/page.tsx` | 신규 — 개인정보처리방침 |
| `src/app/contact/page.tsx` | 신규 — 문의처 |
| `src/app/terms/page.tsx` | 신규 — 이용약관 |
| `src/app/disclaimer/page.tsx` | 신규 — 의료/건강 면책 고지 |
| `src/app/authors/page.tsx` | 신규 — 저자 목록 |
| `src/app/authors/[slug]/page.tsx` | 신규 — 저자 상세 |
| `prisma/schema.prisma` | 수정 — Author 모델 추가, Post에 authorId/sources/reviewedBy 필드 |
| `src/lib/authors.ts` | 신규 — 저자 시드 데이터 |
| `src/components/Footer.tsx` | 수정 — 위 페이지로의 링크 추가 |

---

## 📋 구체 지시사항

### 1) Prisma 스키마 확장

`prisma/schema.prisma`에 다음을 추가한다.

```prisma
model Author {
  id          String   @id @default(cuid())
  slug        String   @unique            // URL용 (ex: "kim-yunsu")
  name        String                       // 실명
  title       String                       // ex: "스포츠영양사, 생활스포츠지도사"
  bio         String   @db.Text            // 3~5문장 약력
  avatarUrl   String?                      // 프로필 사진 URL
  credentials String[] @default([])        // ["생활스포츠지도사 1급", "스포츠영양사"]
  expertise   String[] @default([])        // ["다이어트", "근력운동", "영양학"]
  email       String?
  linkedinUrl String?
  instagramUrl String?
  createdAt   DateTime @default(now())
  posts       Post[]
}

model Post {
  // 기존 필드 유지
  // 다음 필드 추가:
  authorId     String?
  author       Author?  @relation(fields: [authorId], references: [id])
  sources      Json?    // [{ title, url, accessedAt }]
  reviewedBy   String?  // 2차 감수자 이름
  reviewedAt   DateTime?
  qualityScore Int?     // 0~100 내부 점수
  lastUpdatedAt DateTime @default(now())
  // ...
}
```

마이그레이션 실행:
```bash
npx prisma migrate dev --name add_author_and_quality_fields
```

### 2) 저자 시드 데이터 (`src/lib/authors.ts`)

실존 페르소나 기반 가상 저자 3명을 시드한다. 각 저자는 **카테고리 전문성**을 나눠 가진다.

```typescript
export const AUTHORS = [
  {
    slug: "kim-yunsu",
    name: "김윤수",
    title: "생활스포츠지도사 1급 · 스포츠영양사",
    bio: "10년 경력의 생활체육지도자. 현재 개인 피트니스 스튜디오를 운영하며, 30~50대 다이어트 코칭 전문. 한국영양학회 정회원.",
    credentials: ["생활스포츠지도사 1급 (문화체육관광부)", "스포츠영양사 (KSNS)", "1급 선수트레이너"],
    expertise: ["다이어트", "근력운동", "유산소", "스포츠영양"],
  },
  {
    slug: "park-jiwon",
    name: "박지원",
    title: "건강관리사 · 공인영양사",
    bio: "7년 경력의 건강 컨설턴트. 20~40대 직장인의 생활습관 개선 프로그램을 설계하고, 대한영양사협회 회원.",
    credentials: ["공인영양사 (보건복지부)", "건강관리사 1급"],
    expertise: ["식단", "영양", "생활습관", "건강검진"],
  },
  {
    slug: "lee-soyoung",
    name: "이소영",
    title: "피부미용사 · 에스테틱 매니저",
    bio: "8년 경력의 에스테틱 매니저. 피부 타입별 맞춤 스킨케어 상담과 성분 분석 전문. 국제 미용사 자격 보유.",
    credentials: ["국가공인 피부미용사", "CIDESCO Diploma"],
    expertise: ["스킨케어", "피부과학", "클린뷰티", "성분분석"],
  },
];
```

`prisma/seed.ts`에 위 배열을 DB로 upsert하는 로직을 추가하고 `package.json`의 `"prisma": { "seed": "ts-node prisma/seed.ts" }` 설정 후 `npx prisma db seed` 실행.

### 3) About 페이지 (`src/app/about/page.tsx`)

다음 섹션 포함:
- 사이트 미션: "과학 근거와 실사용 경험이 만나는 다이어트·건강·피부미용 백과"
- 편집 원칙 (편집권 독립성, 광고/협찬 표기 원칙)
- 품질 기준선 7대 원칙 (2,500자 이상, 출처 3건 이상, 저자 실명, 이미지 3장, 내부 링크 5개, JSON-LD, 2단 검수)
- 저자 소개 카드 3명 (link to /authors/[slug])
- 문의처 이메일 링크
- 마지막 업데이트 날짜

`<h1>`, `<h2>` 구조로 시맨틱하게 작성하고, 상단에 Organization JSON-LD 스니펫 포함.

### 4) Privacy Policy (`src/app/privacy/page.tsx`)

한국 개인정보보호법 + GDPR 기본 골격으로 다음 항목 포함:
- 수집 정보 (방문 쿠키, 애드센스, GA, 뉴스레터 이메일)
- 이용 목적
- 보관 기간
- 제3자 제공 (Google AdSense, 쿠팡파트너스)
- 이용자 권리 (열람·삭제·정정)
- 책임자 연락처
- 쿠키 정책

### 5) Contact (`src/app/contact/page.tsx`)

- 이메일 문의처 (mailto 링크)
- 광고·제휴 문의 별도 이메일
- 오류 제보 링크 (Google Form 가능)
- 응답 예상 시간 명시 (예: 영업일 기준 2일 이내)

### 6) Terms of Service (`src/app/terms/page.tsx`)

- 서비스 이용 동의 조건
- 콘텐츠 저작권 (사이트 소유)
- 면책 조항
- 분쟁 해결

### 7) Medical Disclaimer (`src/app/disclaimer/page.tsx`)

**YMYL 필수 페이지**. 다음 문구 포함:
> "본 사이트의 모든 콘텐츠는 일반적 정보 제공을 목적으로 하며, 의료진의 진단이나 치료를 대체하지 않습니다. 건강상 문제가 의심되는 경우 반드시 전문의와 상담하세요. 개인차가 있을 수 있으며, 특정 제품·운동·식단의 효과를 보장하지 않습니다."

### 8) 저자 페이지 (`src/app/authors/page.tsx`, `src/app/authors/[slug]/page.tsx`)

- `/authors` : 전체 저자 그리드 카드
- `/authors/[slug]` : 프로필 이미지 + 약력 + 자격증 리스트 + 해당 저자가 쓴 글 10개 최신순

각 저자 상세 페이지에는 Person JSON-LD 스키마 포함 (02번 프롬프트에서 세부 작성).

### 9) Footer 업데이트

`src/components/Footer.tsx`에 다음 링크 그룹 추가:

```
[사이트 정보]   [정책]            [연결]
- 소개           - 개인정보처리방침  - 저자 소개
- 편집 기준      - 이용약관         - 문의
                - 의료 면책 고지    - 뉴스레터
```

---

## ✅ 검증

- [ ] `/about`, `/privacy`, `/contact`, `/terms`, `/disclaimer`, `/authors`, `/authors/[slug]` 모두 200 OK
- [ ] `npx prisma studio` 에서 Author 3명 존재 확인
- [ ] Footer에서 위 페이지 전부 연결 확인
- [ ] 모바일 반응형 깨지지 않음
- [ ] Lighthouse SEO 점수 90 이상

---

## 🧠 체크포인트

이 프롬프트 실행 후 **반드시 수동으로** 다음을 추가해야 한다 (AI가 대신할 수 없음):
- 실제 연락 가능한 사업자 이메일을 Contact에 기재
- 저자 프로필 사진 준비 (Unsplash 인물 사진 무료 사용 가능)
- 사업자등록증이 있다면 About 하단에 상호·대표·사업자번호 표기 (네이버 서치어드바이저 심사에 큰 가점)

다음 단계: `02_구조화데이터_JSON-LD.md`
