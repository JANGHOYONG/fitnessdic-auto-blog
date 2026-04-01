# SEO 자동 블로그 배포 가이드

## 전체 아키텍처

```
[Claude API] → [scripts/] → [SQLite/PostgreSQL] → [Next.js] → [Vercel]
                                                              ↓
                                                    [Cloudflare CDN]
                                                              ↓
                                                     [Google AdSense]
```

---

## 1단계: 로컬 개발 환경 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 ANTHROPIC_API_KEY 등 입력

# 3. DB 초기화 + 시드 데이터
npm run setup

# 4. 개발 서버 실행
npm run dev
# → http://localhost:3000

# 5. 키워드 수집 테스트
npm run collect:keywords -- --category=tech --count=10

# 6. 콘텐츠 생성 테스트 (1개)
npm run generate:content -- --count=1

# 7. 즉시 발행 테스트
npm run publish:posts -- --mode=immediate
```

---

## 2단계: 도메인 설정

### 도메인 구매 추천
- **Namecheap**: 저렴한 가격
- **Cloudflare Registrar**: 원가로 구매 가능
- **가비아/후이즈**: 국내 .co.kr 도메인

### Cloudflare 설정 (CDN + 캐싱)
1. Cloudflare 가입 → 사이트 추가
2. 네임서버를 Cloudflare로 변경
3. SSL/TLS → Full (strict) 설정
4. 캐싱 규칙:
   - `*.html` → 1시간 캐싱
   - `/sitemap.xml` → 1시간 캐싱
   - `/api/*` → 캐싱 안 함

---

## 3단계: Vercel 배포

### 방법 A: Vercel CLI

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel --prod

# 환경변수 설정 (Vercel 대시보드 또는 CLI)
vercel env add ANTHROPIC_API_KEY
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SITE_URL
vercel env add NEXT_PUBLIC_ADSENSE_CLIENT_ID
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID
```

### 방법 B: GitHub 연동 자동 배포

1. GitHub에 레포 Push
2. vercel.com → New Project → Import
3. 환경변수 입력
4. Deploy 클릭

### 데이터베이스 (프로덕션)

Vercel에서는 SQLite 파일 시스템이 불안정하므로 PostgreSQL 사용 권장:

**옵션 1: Vercel Postgres (권장)**
```bash
vercel storage create postgres
# DATABASE_URL 자동 설정됨
```

**옵션 2: Supabase (무료)**
1. supabase.com 가입
2. 새 프로젝트 생성
3. Settings → Database → Connection string 복사
4. `.env`의 `DATABASE_URL` 교체
5. `prisma/schema.prisma`에서 `provider = "postgresql"` 변경

---

## 4단계: 자동화 스케줄러

Vercel은 장기 실행 프로세스를 지원하지 않으므로 스케줄러는 별도 서버에서 실행:

### 방법 A: VPS (Oracle Cloud 무료 티어 추천)

```bash
# Ubuntu 서버에서
git clone your-repo
cd blog-auto
npm install
cp .env.example .env
# .env 설정

# PM2로 스케줄러 실행
npm install -g pm2
pm2 start scripts/scheduler.js --name "blog-auto"
pm2 save
pm2 startup  # 시스템 재시작 시 자동 실행
```

### 방법 B: GitHub Actions (무료)

`.github/workflows/auto-post.yml` 생성:

```yaml
name: Auto Post Generator

on:
  schedule:
    - cron: '0 23 * * *'  # 매일 오전 8시 KST (UTC 23:00)
  workflow_dispatch:

jobs:
  generate-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx prisma generate
      - name: Generate content
        run: node scripts/content-generator.js --count=3
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Publish posts
        run: node scripts/publisher.js --mode=schedule
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**GitHub Secrets 설정:**
Settings → Secrets → New secret으로 추가

---

## 5단계: Google AdSense 설정

1. **AdSense 신청**: adsense.google.com
   - 도메인 인증 (사이트에 코드 삽입)
   - 콘텐츠 충분히 쌓인 후 신청 (10개 이상 게시글 권장)

2. **광고 단위 생성**:
   - 상단 배너: 728×90 (가로형)
   - 중간 광고: 300×250 (직사각형)
   - 하단 배너: 728×90

3. **`.env`에 슬롯 ID 입력**:
   ```
   NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXX
   NEXT_PUBLIC_ADSENSE_SLOT_TOP=1234567890
   ```

---

## 6단계: Google Search Console

1. search.google.com/search-console
2. URL 접두사 방식으로 사이트 추가
3. HTML 태그 방식 인증 → `.env`에 키 입력
4. 사이트맵 제출: `https://yourdomain.com/sitemap.xml`

---

## 운영 체크리스트

- [ ] ANTHROPIC_API_KEY 설정
- [ ] 도메인 연결
- [ ] Cloudflare CDN 설정
- [ ] DATABASE_URL (PostgreSQL) 설정
- [ ] AdSense 신청 및 슬롯 ID 설정
- [ ] Google Analytics 설정
- [ ] Google Search Console 등록 + 사이트맵 제출
- [ ] 스케줄러 실행 (VPS 또는 GitHub Actions)
- [ ] 초기 콘텐츠 10개 이상 수동 확인 후 발행

---

## 비용 예상 (월간)

| 항목 | 비용 |
|------|------|
| 도메인 (.com) | ~$12/년 = $1/월 |
| Vercel (무료 티어) | $0 |
| Cloudflare (무료 티어) | $0 |
| Oracle Cloud VPS (무료) | $0 |
| Claude API (일 3글 × 30일) | ~$3~5/월 |
| **합계** | **$4~6/월** |

AdSense 수익 목표: 월 $50~200 (6개월 운영 기준)
