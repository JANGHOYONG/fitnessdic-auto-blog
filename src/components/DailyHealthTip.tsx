/**
 * 오늘의 건강 한 줄 + 추천 글
 * - 날짜별로 건강 질문이 바뀜 (day-of-year 기반 순환)
 * - 질문과 관련된 인기 글 1개를 DB에서 가져와 카드로 표시
 */

import Link from 'next/link';
import { prisma } from '@/lib/db';

// ── 35개 운동·다이어트 팁 (7개 주제 × 5개씩, 날마다 순환) ──────────────────────
const DAILY_TIPS = [
  // 체중감량
  { emoji: '🔥', question: '저칼로리 다이어트를 하는데 살이 안 빠지는 이유?', hint: '칼로리를 너무 줄이면 오히려 기초대사량이 떨어집니다.', query: '체중감량', label: '체중감량' },
  { emoji: '🔥', question: '간헐적 단식, 모든 사람에게 효과 있는 게 아니라고?', hint: '호르몬 상태에 따라 역효과가 날 수 있습니다.', query: '다이어트', label: '체중감량' },
  { emoji: '🔥', question: '체중 정체기, 같은 방법으로 계속하면 안 되는 이유?', hint: '몸이 적응하면 자극을 바꿔야 합니다.', query: '체중감량', label: '체중감량' },
  { emoji: '🔥', question: '운동 없이 식단만으로 살 빼면 나중에 무슨 일이 일어날까?', hint: '근육 손실로 인해 요요가 훨씬 심해질 수 있습니다.', query: '다이어트', label: '체중감량' },
  { emoji: '🔥', question: '체중계 숫자가 안 줄었는데 몸이 변하고 있다?', hint: '지방과 근육이 동시에 변할 때 나타나는 현상입니다.', query: '체지방', label: '체중감량' },
  // 근력운동
  { emoji: '💪', question: '스쿼트를 하면 무릎이 아픈 이유, 자세 문제일까?', hint: '발 너비와 무릎 방향이 핵심입니다.', query: '근력운동', label: '근력운동' },
  { emoji: '💪', question: '근육통이 없으면 운동 효과가 없는 걸까?', hint: '근육통은 성장 지표가 아닙니다.', query: '근육', label: '근력운동' },
  { emoji: '💪', question: '매일 헬스장 가는데 근육이 안 느는 이유?', hint: '회복이 근육 성장의 핵심이라는 걸 알면 답이 보입니다.', query: '근력운동', label: '근력운동' },
  { emoji: '💪', question: '단백질 타이밍, 운동 직후가 정말 골든타임일까?', hint: '최신 연구는 하루 총 섭취량이 더 중요하다고 말합니다.', query: '근육', label: '근력운동' },
  { emoji: '💪', question: '고중량 vs 저중량 고반복, 어느 게 더 효과적일까?', hint: '목적에 따라 다르지만, 의외의 연구 결과가 있습니다.', query: '웨이트', label: '근력운동' },
  // 유산소·러닝
  { emoji: '🏃', question: '공복 유산소, 지방을 더 태운다는 게 사실일까?', hint: '연구마다 결론이 다르고, 개인차가 큽니다.', query: '유산소', label: '유산소·러닝' },
  { emoji: '🏃', question: '달리기를 하면 무릎이 망가진다는 통념, 사실일까?', hint: '오히려 연골을 강화한다는 연구가 있습니다.', query: '러닝', label: '유산소·러닝' },
  { emoji: '🏃', question: '유산소 운동이 근육을 태운다는 말, 어디까지 맞을까?', hint: '조건에 따라 다르지만, 잘못 이해되고 있습니다.', query: '유산소', label: '유산소·러닝' },
  { emoji: '🏃', question: '심박수 130과 160, 지방 연소 효율에 차이가 있을까?', hint: '지방 연소 최적 구간은 생각보다 낮습니다.', query: '달리기', label: '유산소·러닝' },
  { emoji: '🏃', question: 'HIIT와 저강도 유산소, 살 빠지는 양은 같다?', hint: '운동 후 칼로리 소모까지 따지면 다른 그림이 나옵니다.', query: '유산소', label: '유산소·러닝' },
  // 식단·영양
  { emoji: '🥗', question: '탄수화물을 줄이면 초반에 살이 빠지는 진짜 이유?', hint: '지방이 아닌 수분이 빠지는 것입니다.', query: '식단', label: '식단·영양' },
  { emoji: '🥗', question: '닭가슴살만 먹는 다이어트, 장기적으로 문제가 있을까?', hint: '단백질만 먹으면 오히려 지방으로 전환됩니다.', query: '단백질', label: '식단·영양' },
  { emoji: '🥗', question: '칼로리가 같으면 어떤 음식이든 같이 살이 찔까?', hint: '인슐린 반응이 다르면 체지방 축적량도 달라집니다.', query: '칼로리', label: '식단·영양' },
  { emoji: '🥗', question: '운동 후 탄수화물을 먹어야 근육이 는다?', hint: '시간대와 종류에 따라 효과가 완전히 달라집니다.', query: '식단', label: '식단·영양' },
  { emoji: '🥗', question: '하루 단백질 권장량, 체중 1kg당 몇 g이 맞을까?', hint: '운동 강도에 따라 기준이 크게 달라집니다.', query: '단백질', label: '식단·영양' },
  // 홈트레이닝
  { emoji: '🏠', question: '플랭크 매일 1분씩 하면 복근이 생길까?', hint: '복근은 운동보다 식단이 90%라는 말을 들어보셨나요?', query: '홈트', label: '홈트레이닝' },
  { emoji: '🏠', question: '맨몸 운동만으로 헬스장 못지않게 근육을 키울 수 있을까?', hint: '점진적 과부하 원리를 알면 가능합니다.', query: '홈트레이닝', label: '홈트레이닝' },
  { emoji: '🏠', question: '홈트를 3개월 해도 몸이 안 변하는 가장 흔한 이유?', hint: '강도가 아닌 루틴 구성 문제인 경우가 많습니다.', query: '홈트', label: '홈트레이닝' },
  { emoji: '🏠', question: '버피 운동 10개가 달리기 1km와 같다는 게 맞을까?', hint: '칼로리 소모보다 심폐 부하 측면에서 비교해야 합니다.', query: '맨몸운동', label: '홈트레이닝' },
  { emoji: '🏠', question: '운동 매트 없이 홈트를 하면 부상 위험이 얼마나 높아질까?', hint: '관절 충격 흡수가 핵심입니다.', query: '홈트', label: '홈트레이닝' },
  // 다이어트 식품
  { emoji: '🧴', question: '단백질 보충제, 신장에 부담을 준다는 게 사실일까?', hint: '건강한 사람에게는 해당되지 않는다는 연구가 있습니다.', query: '보충제', label: '다이어트 식품' },
  { emoji: '🧴', question: '가르시니아·녹차 추출물 다이어트 보조제, 진짜 효과가 있을까?', hint: '임상 연구 결과는 기대와 다릅니다.', query: '다이어트식품', label: '다이어트 식품' },
  { emoji: '🧴', question: '크레아틴을 먹으면 살이 찐다는 소문, 진실은?', hint: '수분 증가와 지방 증가는 다릅니다.', query: '보충제', label: '다이어트 식품' },
  { emoji: '🧴', question: 'BCAA, 정말 근손실을 막아줄까?', hint: '단백질을 충분히 먹는다면 따로 필요 없다는 연구가 있습니다.', query: '보충제', label: '다이어트 식품' },
  { emoji: '🧴', question: '프로틴 바, 식사 대용으로 먹어도 될까?', hint: '설탕 함량이 과자 수준인 제품이 많습니다.', query: '단백질보충제', label: '다이어트 식품' },
  // 바디프로필·동기
  { emoji: '📸', question: '바디프로필 준비 중 극단적 감량, 몸에 어떤 영향을 줄까?', hint: '단기 극감량은 근육 손실과 호르몬 교란을 일으킵니다.', query: '바디프로필', label: '바디프로필·동기' },
  { emoji: '📸', question: '운동 습관이 3개월이 지나도 안 만들어지는 이유?', hint: '의지력이 아닌 환경 설계의 문제입니다.', query: '운동동기', label: '바디프로필·동기' },
  { emoji: '📸', question: '헬스장 등록하고 한 달 만에 그만두는 심리적 이유?', hint: '목표 설정 방식이 동기 소멸을 유발합니다.', query: '습관', label: '바디프로필·동기' },
  { emoji: '📸', question: '운동 영상만 보다가 정작 운동 안 하는 이유?', hint: '정보 소비가 실천의 착각을 만드는 원리가 있습니다.', query: '운동동기', label: '바디프로필·동기' },
  { emoji: '📸', question: '눈바디 체크, 체중계보다 더 정확한 이유?', hint: '체중은 같아도 몸의 구성이 달라질 수 있습니다.', query: '바디프로필', label: '바디프로필·동기' },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function formatKoreanDate(): string {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const day = days[now.getDay()];
  return `${month}월 ${date}일 (${day})`;
}

export default async function DailyHealthTip() {
  const dayIdx = getDayOfYear() % DAILY_TIPS.length;
  const tip = DAILY_TIPS[dayIdx];

  // DB 쿼리 — 실패해도 tip만 보여주는 fallback 처리
  let post: { title: string; slug: string; thumbnail: string | null; category: { slug: string; name: string } } | null = null;
  try {
    // 관련 주제에서 가장 조회수 높은 글 1개
    const featured = await prisma.post.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: tip.query } },
          { excerpt: { contains: tip.query } },
          { keywords: { contains: tip.query } },
        ],
      },
      select: { title: true, slug: true, thumbnail: true, category: { select: { slug: true, name: true } } },
      orderBy: { viewCount: 'desc' },
    });

    // 관련 글 없으면 최신 글 1개
    post = featured ?? await prisma.post.findFirst({
      where: { status: 'PUBLISHED' },
      select: { title: true, slug: true, thumbnail: true, category: { select: { slug: true, name: true } } },
      orderBy: { publishedAt: 'desc' },
    });
  } catch {
    // DB 접근 실패 시 tip 텍스트만 표시
  }

  const postHref = post ? `/${post.category.slug}/${post.slug}` : '/fitness';
  const thumbnail = post?.thumbnail ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div
        style={{
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1.5px solid var(--border)',
          boxShadow: '0 4px 20px rgba(30,158,122,0.10)',
          background: 'var(--bg-card)',
        }}
      >
        <div className="flex flex-col sm:flex-row">

          {/* 왼쪽: 오늘의 건강 질문 */}
          <div
            className="flex-1 p-5 sm:p-7 flex flex-col justify-between"
            style={{ minWidth: 0 }}
          >
            {/* 상단 라벨 */}
            <div className="flex items-center gap-2 mb-4">
              <span
                style={{
                  background: 'linear-gradient(90deg, #1E9E7A, #4fc3a1)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  letterSpacing: '0.5px',
                }}
              >
                오늘의 건강 궁금증
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {formatKoreanDate()}
              </span>
            </div>

            {/* 질문 */}
            <div className="mb-5">
              <p
                className="font-bold leading-snug mb-3"
                style={{ fontSize: 'clamp(17px, 2.5vw, 22px)', color: 'var(--text)', lineHeight: 1.45 }}
              >
                {tip.emoji} {tip.question}
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {tip.hint}
              </p>
            </div>

            {/* CTA */}
            {post && (
              <Link
                href={postHref}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(90deg, #177A5E, #1E9E7A)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '11px 20px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  alignSelf: 'flex-start',
                  minHeight: '44px',
                }}
              >
                답 확인하기 →
              </Link>
            )}
          </div>

          {/* 오른쪽: 추천 글 카드 */}
          {post && (
            <Link
              href={postHref}
              className="sm:w-64 flex-shrink-0 block"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="h-full flex flex-col"
                style={{
                  borderLeft: '1.5px solid var(--border)',
                  background: 'var(--bg)',
                }}
              >
                {/* 썸네일 — 이미지 있을 때만 표시 */}
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt={post.title}
                    style={{
                      width: '100%',
                      height: '140px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    loading="lazy"
                  />
                )}

                {/* 글 정보 */}
                <div style={{ padding: '14px 16px', flex: 1 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      background: 'rgba(30,158,122,0.12)',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      marginBottom: '8px',
                    }}
                  >
                    {tip.label}
                  </span>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {post.title}
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      marginTop: '10px',
                    }}
                  >
                    읽어보기 →
                  </p>
                </div>
              </div>
            </Link>
          )}

        </div>
      </div>
    </div>
  );
}
