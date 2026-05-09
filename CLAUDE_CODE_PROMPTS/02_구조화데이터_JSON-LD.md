# 02 · 구조화 데이터 (JSON-LD) 전면 적용

## 🎯 목표

구글·네이버 검색 엔진이 사이트 구조를 명확히 이해하고, 리치 리절트(별점·FAQ 접힘·브레드크럼·지식그래프)로 **클릭률을 높이도록** JSON-LD 스키마를 전면 적용한다.

구조화 데이터는 애드센스 심사 통과의 '보이지 않는 합격 요인'이며, 네이버 스마트블록 노출의 선결 조건이기도 하다.

---

## 📂 수정/생성할 파일

| 경로 | 작업 |
|------|------|
| `src/lib/schema.ts` | 신규 — JSON-LD 빌더 함수 모음 |
| `src/components/JsonLd.tsx` | 신규 — `<script type="application/ld+json">` 렌더러 |
| `src/app/layout.tsx` | 수정 — Organization + WebSite 스키마 주입 |
| `src/app/page.tsx` | 수정 — ItemList(최신글) 스키마 주입 |
| `src/app/post/[slug]/page.tsx` | 수정 — Article + FAQPage + BreadcrumbList 주입 |
| `src/app/authors/[slug]/page.tsx` | 수정 — Person 스키마 주입 |
| `src/app/category/[slug]/page.tsx` | 수정 — CollectionPage 스키마 주입 |

---

## 📋 구체 지시사항

### 1) `src/lib/schema.ts` — 스키마 빌더 모음

사이트 전역 상수와 빌더 함수를 한 곳에 둔다.

```typescript
const SITE = {
  name: "다이어트·건강·피부미용 백과",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://example.co.kr",
  logo: "/logo.png",
  sameAs: [
    "https://www.youtube.com/@your-channel",
    "https://www.instagram.com/your-handle",
  ],
};

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}${SITE.logo}`,
    sameAs: SITE.sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@your-domain.co.kr",
      availableLanguage: ["Korean"],
    },
  };
}

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleSchema(post) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [post.coverImage] : [],
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.lastUpdatedAt?.toISOString() || post.publishedAt?.toISOString(),
    author: post.author ? {
      "@type": "Person",
      name: post.author.name,
      url: `${SITE.url}/authors/${post.author.slug}`,
    } : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}${SITE.logo}` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE.url}/post/${post.slug}` },
    articleSection: post.category,
    keywords: post.tags?.join(", "),
  };
}

export function faqSchema(faqs) {  // [{question, answer}, ...]
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function breadcrumbSchema(crumbs) {  // [{name, url}, ...]
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function personSchema(author) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    image: author.avatarUrl,
    url: `${SITE.url}/authors/${author.slug}`,
    knowsAbout: author.expertise,
    hasCredential: author.credentials?.map(c => ({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "certification",
      name: c,
    })),
  };
}

export function collectionPageSchema(category, posts) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.label} 카테고리`,
    url: `${SITE.url}/category/${category.id}`,
    hasPart: posts.slice(0, 10).map(p => ({
      "@type": "Article",
      headline: p.title,
      url: `${SITE.url}/post/${p.slug}`,
    })),
  };
}
```

### 2) `src/components/JsonLd.tsx`

```tsx
export default function JsonLd({ data }: { data: Record<string, any> | Record<string, any>[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
    </>
  );
}
```

### 3) `src/app/layout.tsx`

`<head>` 안 또는 `<body>` 최상단에 전역 스키마 삽입:

```tsx
import JsonLd from "@/components/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";

// ... 기존 RootLayout 내부
<JsonLd data={[organizationSchema(), webSiteSchema()]} />
```

### 4) `src/app/post/[slug]/page.tsx`

상세 페이지 최상단에 세 가지 스키마를 같이 주입한다.

```tsx
<JsonLd data={[
  articleSchema(post),
  faqSchema(post.faqs ?? []),
  breadcrumbSchema([
    { name: "홈", url: `${SITE.url}` },
    { name: post.category, url: `${SITE.url}/category/${post.categoryId}` },
    { name: post.title, url: `${SITE.url}/post/${post.slug}` },
  ]),
]} />
```

FAQ가 없는 글은 `faqSchema([])` 대신 조건부로 아예 렌더하지 않도록 처리.

### 5) 저자 상세 페이지

```tsx
<JsonLd data={personSchema(author)} />
```

### 6) 카테고리 페이지

```tsx
<JsonLd data={collectionPageSchema(category, posts)} />
```

---

## ✅ 검증

- [ ] 각 페이지의 HTML 소스에서 `application/ld+json` 스크립트 존재 확인
- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results) 통과
- [ ] [Schema.org Validator](https://validator.schema.org/) 통과
- [ ] FAQ가 있는 글이 Google에서 "FAQ 스니펫" 후보로 인식되는지 (색인 후)
- [ ] 저자 이름이 Google Search에서 Person Knowledge Panel 후보로 인식되는지 (색인 후)

---

## 🧠 체크포인트

- **절대 거짓 정보를 스키마에 넣지 않는다** — 가짜 `aggregateRating` 등은 구글이 적발하면 수동 패널티를 준다.
- FAQ 스키마는 본문에 실제로 같은 내용이 렌더되어 있어야 유효하다 (숨겨진 FAQ 금지).
- `mainEntityOfPage`의 URL은 canonical URL과 일치해야 한다.

다음 단계: `03_아티클페이지_리디자인.md`
