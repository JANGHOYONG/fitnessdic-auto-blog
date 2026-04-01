import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GeneratedPost {
  titles: string[];
  selectedTitle: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  keywords: string[];
  readTime: number;
}

// 카테고리별 글쓰기 스타일 프리셋
const CATEGORY_STYLES: Record<string, string> = {
  health: '건강 전문 칼럼니스트처럼 신뢰감 있고 실용적으로',
  tech: 'IT 전문 기자처럼 트렌디하고 이해하기 쉽게',
  economy: '경제 전문 애널리스트처럼 데이터 기반으로 명확하게',
  lifestyle: '친근한 생활 정보 전문가처럼 공감대를 형성하며',
  travel: '여행 전문 에디터처럼 생생하고 설레는 느낌으로',
};

export async function generateBlogPost(
  keyword: string,
  categorySlug: string,
  existingSlugs: string[] = []
): Promise<GeneratedPost> {
  const style = CATEGORY_STYLES[categorySlug] || '전문적이고 신뢰감 있게';

  const prompt = `당신은 SEO 최적화된 블로그 글을 쓰는 전문 작가입니다.

다음 키워드로 블로그 글을 작성해주세요: "${keyword}"

[글쓰기 스타일]
- ${style} 작성
- 실제 사람이 쓴 것처럼 자연스럽고 구어체 적절히 섞기
- AI가 쓴 티가 나지 않도록 개인적인 경험, 구체적 수치, 사례 포함
- 독자의 궁금증을 해결하는 실질적인 정보 제공

[SEO 요구사항]
- 키워드를 제목, 첫 문단, 소제목에 자연스럽게 포함
- 롱테일 키워드 변형 자연스럽게 사용
- 내부 링크를 위한 관련 주제 언급

[응답 형식 - 반드시 아래 JSON 형식으로만 응답]
{
  "titles": [
    "제목 후보 1 (궁금증 유발형)",
    "제목 후보 2 (숫자/리스트형)",
    "제목 후보 3 (해결책 제시형)"
  ],
  "selectedTitle": "위 3개 중 클릭률이 가장 높을 것으로 예상되는 제목",
  "metaTitle": "검색 결과에 표시될 SEO 타이틀 (60자 이내)",
  "metaDescription": "검색 결과 설명 (150-160자, 키워드 포함, 클릭 유도)",
  "excerpt": "글 요약 (100-150자)",
  "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3", "롱테일키워드4", "롱테일키워드5"],
  "content": "HTML 형식의 본문 전체"
}

[content HTML 구조 요구사항]
<article>
  <section class="intro">
    <p>서론 (150자 내외, 독자 공감 + 키워드 포함)</p>
  </section>

  <div class="ad-slot ad-top"></div>

  <section>
    <h2>소제목 1 (핵심 내용)</h2>
    <p>본문 500자 이상, 구체적인 정보와 수치 포함</p>
  </section>

  <section>
    <h2>소제목 2</h2>
    <p>본문...</p>
  </section>

  <div class="ad-slot ad-middle"></div>

  <section>
    <h2>소제목 3</h2>
    <p>본문...</p>
  </section>

  <section>
    <h2>소제목 4</h2>
    <p>본문...</p>
  </section>

  <section>
    <h2>소제목 5 (선택, 필요 시)</h2>
    <p>본문...</p>
  </section>

  <div class="ad-slot ad-bottom"></div>

  <section class="conclusion">
    <h2>마무리</h2>
    <p>결론 (200자 내외, 핵심 요약 + 행동 유도)</p>
  </section>
</article>

주의:
- 광고 슬롯 div는 그대로 포함할 것 (실제 광고는 프론트에서 삽입)
- 소제목은 4~6개
- 각 본문 섹션은 500자 이상
- 전체 글은 2500자 이상
- 중복 콘텐츠 방지: 다른 글과 겹치지 않는 독창적 관점 제시`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // JSON 파싱 (마크다운 코드블록 제거)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                    text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error('Claude API 응답을 파싱할 수 없습니다.');
  }

  const parsed = JSON.parse(jsonMatch[1]);

  // 읽기 시간 계산
  const textLength = parsed.content.replace(/<[^>]*>/g, '').length;
  const readTime = Math.max(1, Math.ceil(textLength / 500));

  return {
    ...parsed,
    readTime,
  };
}

// 키워드 관련성 분석
export async function analyzeKeywords(
  category: string,
  count: number = 20
): Promise<Array<{ keyword: string; priority: number; searchIntent: string }>> {
  const prompt = `SEO 전문가로서 "${category}" 카테고리에 적합한 한국어 롱테일 키워드 ${count}개를 추천해주세요.

조건:
- 검색량이 어느 정도 있지만 경쟁이 낮은 롱테일 키워드
- 정보성 검색 의도 (방법, 이유, 추천, 비교 등)
- 실제 사람들이 궁금해하는 주제

JSON 형식으로만 응답:
{
  "keywords": [
    {
      "keyword": "키워드",
      "priority": 1~5 (1이 최고 우선순위),
      "searchIntent": "informational/navigational/transactional"
    }
  ]
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                    text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[1]);
  return parsed.keywords || [];
}
