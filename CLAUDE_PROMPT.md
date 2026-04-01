# Claude 채팅 글 생성 프롬프트 템플릿

아래 프롬프트를 Claude.ai 채팅에 복사 후, 키워드와 카테고리만 바꿔서 사용하세요.

---

## 프롬프트 (복사해서 사용)

```
아래 조건으로 SEO 최적화 블로그 글을 작성해줘.

[키워드]: 여기에 키워드 입력 (예: 혈당 낮추는 음식)
[카테고리]: 여기에 입력 (health / tech / economy / lifestyle / travel 중 하나)

[글 작성 조건]
- 전체 순수 한국어, 5,000자 내외
- 자연스러운 구어체+문어체 혼용 (AI 티 나지 않게)
- 구체적 수치, 실사례, 경험담 포함
- 맞춤법/띄어쓰기 정확하게

[결과물 형식 - JSON으로 출력]
{
  "category": "카테고리슬러그",
  "title": "최종 선택 제목",
  "metaTitle": "검색결과 타이틀 (55자 이내, 키워드 포함)",
  "metaDescription": "검색결과 설명 (140~155자, 키워드+클릭유도 포함)",
  "excerpt": "글 요약 (100~130자)",
  "keywords": ["핵심키워드", "관련키워드2", "관련키워드3", "롱테일1", "롱테일2"],
  "content": "아래 HTML 구조로 작성"
}

[content HTML 구조]
<article>
  <section class="intro">
    <p>서론 (150자 내외, 독자 공감 + 키워드 자연스럽게 포함)</p>
  </section>

  <div class="ad-slot ad-top"></div>

  <section>
    <h2>소제목1 (핵심 개념/원인)</h2>
    <p>본문 600자 이상, 구체적 수치와 사례 포함</p>
  </section>

  <section>
    <h2>소제목2 (방법/해결책)</h2>
    <p>본문 600자 이상</p>
    <ul>
      <li>항목1 설명</li>
      <li>항목2 설명</li>
      <li>항목3 설명</li>
    </ul>
  </section>

  <div class="ad-slot ad-middle"></div>

  <section>
    <h2>소제목3 (주의사항/팁)</h2>
    <p>본문 500자 이상</p>
  </section>

  <section>
    <h2>소제목4 (심화/실전 활용)</h2>
    <p>본문 500자 이상</p>
  </section>

  <div class="ad-slot ad-bottom"></div>

  <section class="conclusion">
    <h2>마무리</h2>
    <p>결론 200자 내외, 핵심 요약 + 행동 촉구</p>
  </section>
</article>
```

---

## 블로그 등록 방법

1. Claude 채팅에서 JSON 결과물 복사
2. 아래 파일에 붙여넣기:
   ```
   /Users/janghoyong/BLOG AUTO/scripts/post-input.json
   ```
3. 터미널에서 실행:
   ```bash
   cd "/Users/janghoyong/BLOG AUTO"
   node scripts/add-post.js
   node scripts/publisher.js --mode=immediate
   ```
4. http://localhost:3000 에서 확인

---

## 카테고리 슬러그 참고

| 카테고리 | 슬러그 |
|---------|--------|
| 건강·의학 | health |
| IT·테크 | tech |
| 경제·재테크 | economy |
| 생활정보 | lifestyle |
| 여행·문화 | travel |
