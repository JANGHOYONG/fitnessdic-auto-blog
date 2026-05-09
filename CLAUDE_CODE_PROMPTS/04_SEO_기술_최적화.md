# 04 · SEO 기술 최적화 (sitemap · robots · RSS · metadata)

## 🎯 목표

네이버와 구글 로봇이 사이트 구조를 정확히 이해하고 모든 글을 빠르게 색인하도록 **기술 SEO 인프라**를 완전히 정비한다. 이 단계가 완료되지 않으면 아무리 좋은 콘텐츠를 써도 검색 결과에 나타나지 않는다.

---

## 📂 수정/생성할 파일

| 경로 | 작업 |
|------|------|
| `src/app/sitemap.ts` | 신규/수정 — 동적 사이트맵 |
| `src/app/robots.ts` | 신규/수정 — 동적 robots.txt |
| `src/app/feed.xml/route.ts` | 신규 — RSS 2.0 피드 |
| `src/app/naver-site-verification.txt` | 신규(placeholder) — 네이버 인증 |
| `src/app/google-site-verification.html` | 신규(placeholder) — 구글 인증 |
| `src/app/layout.tsx` | 수정 — 글로벌 메타데이터 |
| `src/app/post/[slug]/page.tsx` | 수정 — `generateMetadata` 완성 |
| `next.config.js` | 수정 — 리다이렉트, 트레일링 슬래시 |
| `src/middleware.ts` | 신규 — canonical·trailing slash 정규화 |
| `src/app/search/page.tsx` | 신규 — 사이트 내 검색 (WebSite SearchAction과 연결) |

---

## 📋 구체 지시사항

### 1) `src/app/sitemap.ts`

```typescript
import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, lastUpdatedAt: true, publishedAt: true },
  });
  const authors = await prisma.author.findMany({ select: { slug: true } });
  const categories = ["diet","exercise","nutrition","beauty","skincare","health","hometraining","supplement","motivation","running"];

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/authors`, changeFrequency: "weekly", priority: 0.6 },
    ...categories.map(c => ({
      url: `${SITE_URL}/category/${c}`,
      changeFrequency: "daily" as const, priority: 0.8,
    })),
    ...authors.map(a => ({
      url: `${SITE_URL}/authors/${a.slug}`,
      changeFrequency: "weekly" as const, priority: 0.6,
    })),
    ...posts.map(p => ({
      url: `${SITE_URL}/post/${p.slug}`,
      lastModified: p.lastUpdatedAt ?? p.publishedAt ?? new Date(),
      changeFrequency: "weekly" as const, priority: 0.9,
    })),
  ];
}
```

### 2) `src/app/robots.ts`

```typescript
import { MetadataRoute } from "next";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/draft/"] },
      { userAgent: "Yeti", allow: "/" },       // 네이버
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "Daum", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

### 3) `src/app/feed.xml/route.ts` — RSS 2.0 피드

```typescript
import { prisma } from "@/lib/prisma";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { author: true },
  });
  const items = posts.map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${SITE_URL}/post/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/post/${p.slug}</guid>
      <pubDate>${p.publishedAt?.toUTCString()}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
      ${p.author ? `<author>${p.author.name}</author>` : ""}
      <category>${p.category || ""}</category>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>다이어트·건강·피부미용 백과</title>
    <link>${SITE_URL}</link>
    <description>과학 근거 기반의 다이어트·건강·피부미용 백과</description>
    <language>ko-KR</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
```

### 4) `src/app/layout.tsx` 글로벌 메타데이터

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: {
    default: "다이어트·건강·피부미용 백과 — 과학 근거로 믿을 수 있는 생활 백과",
    template: "%s · 다이어트·건강·피부미용 백과",
  },
  description: "20~40대를 위한 과학 근거 기반 다이어트, 건강, 피부미용 정보. 전문가 감수·실사용 리뷰·단계별 실행 가이드.",
  keywords: ["다이어트","운동","헬스","피부미용","스킨케어","건강","영양","이너뷰티","홈트"],
  authors: [{ name: "다이어트·건강·피부미용 백과 편집부" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "다이어트·건강·피부미용 백과",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  verification: {
    google: "YOUR_GOOGLE_CODE",
    other: { "naver-site-verification": "YOUR_NAVER_CODE" },
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
};
```

### 5) `src/app/post/[slug]/page.tsx` — `generateMetadata`

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await prisma.post.findUnique({ where: { slug: params.slug }, include: { author: true }});
  if (!post) return {};
  const canonical = `/post/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.lastUpdatedAt?.toISOString(),
      authors: post.author ? [post.author.name] : undefined,
      tags: post.tags,
      images: post.coverImage ? [{ url: post.coverImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
    keywords: post.tags,
  };
}
```

### 6) `src/middleware.ts` — 정규화

- `www → non-www` (또는 반대) 301
- 트레일링 슬래시 정리
- 대소문자 정규화

### 7) 네이버·구글 인증 파일

- `src/app/naver-site-verification.txt` — 네이버 서치어드바이저에서 받은 값을 그대로 본문으로 저장.
- `src/app/google-site-verification.html` — 구글 서치콘솔 HTML 인증.
- 또는 위의 `metadata.verification`으로 대체(권장).

### 8) 사이트 내 검색 (`/search?q=...`)

간단한 prisma full-text 검색. WebSite JSON-LD의 `potentialAction`과 쌍을 이뤄야 `sitelinks search box` 후보가 된다.

---

## ✅ 검증

- [ ] `curl https://example.co.kr/sitemap.xml` — 정상 XML
- [ ] `curl https://example.co.kr/robots.txt` — 네이버/구글 둘 다 Allow
- [ ] `curl https://example.co.kr/feed.xml` — 유효한 RSS 2.0
- [ ] [W3C Feed Validator](https://validator.w3.org/feed/) 통과
- [ ] 서치콘솔 `sitemap.xml` 제출 성공
- [ ] 네이버 서치어드바이저 `sitemap.xml` 제출 성공
- [ ] 네이버 로봇(Yeti)이 robots에서 Allow

---

## 🧠 체크포인트 — 네이버 특화 팁

- **네이버 서치어드바이저 소유확인** 후 다음을 모두 실행:
  1. `sitemap.xml` 제출
  2. `rss` 피드 별도 제출 (네이버는 RSS를 중요하게 본다)
  3. "웹페이지 수집 요청"으로 신규 글 5건 수동 제출 (인덱싱 가속)
  4. "검색 노출 여부 확인"으로 Yeti가 막히지 않는지 점검
  5. 네이버 블로그/카페에 **자기 글 인용 링크 3건 이상 만들기** (소셜 시그널 가점)

- **구글 서치콘솔** 설정 후:
  1. `sitemap.xml` 제출
  2. URL 검사 도구로 주요 10개 글 수동 색인 요청
  3. 'Coverage' 리포트에서 '제외됨' 이유가 'Duplicate without user-selected canonical'이 아닌지 확인

다음 단계: `05_브랜드_디자인_시스템.md`
