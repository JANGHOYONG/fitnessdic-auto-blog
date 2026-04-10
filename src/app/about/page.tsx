import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '블로그 소개 | 다이어트·운동 백과',
  description: '30·40·50대를 위한 과학적 다이어트·운동 블로그 다이어트·운동 백과를 소개합니다.',
};

const TOPICS = [
  { icon: '🔥', name: '체중감량', slug: 'fitness', query: '체중감량', desc: '지방연소·요요 방지, 간헐적 단식·칼로리 계산 과학적 가이드' },
  { icon: '💪', name: '근력운동', slug: 'fitness', query: '근력운동', desc: '스쿼트·데드리프트·벤치프레스, 근비대 분할 루틴 완벽 가이드' },
  { icon: '🏃', name: '유산소·러닝', slug: 'fitness', query: '유산소', desc: '지방 연소 최적 유산소, 달리기 입문·마라톤 준비법' },
  { icon: '🥗', name: '식단·영양', slug: 'fitness', query: '식단', desc: '다이어트 식단 설계, 단백질·칼로리 계산, 운동 전후 영양 타이밍' },
  { icon: '🏠', name: '홈트레이닝', slug: 'fitness', query: '홈트', desc: '기구 없이 집에서 하는 맨몸운동·홈트 루틴 완전 가이드' },
  { icon: '🧴', name: '다이어트 식품', slug: 'fitness', query: '보충제', desc: '단백질 보충제·프로틴·크레아틴, 다이어트 식품 효과 검증' },
  { icon: '📸', name: '바디프로필·동기', slug: 'fitness', query: '바디프로필', desc: '바디프로필 준비, 운동 습관 만들기, 다이어트 동기 유지법' },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* 헤더 */}
      <div className="text-center mb-12">
        <p className="text-5xl mb-4">💪</p>
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>다이어트·운동 백과</h1>
        <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
          30·40·50대를 위한 과학적 다이어트·운동 가이드
        </p>
      </div>

      {/* 소개 */}
      <section className="card p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>안녕하세요 👋</h2>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>다이어트·운동 백과</strong>는 30·40·50대가
          과학적으로 몸을 만들고 건강하게 살 뺄 수 있도록 돕는 운동·다이어트 전문 블로그입니다.
        </p>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          체중감량·근력운동·유산소·식단·홈트레이닝·다이어트 식품·바디프로필까지, 7대 운동 주제를
          매일 국가공인 스포츠지도사·영양사 수준의 근거 기반 콘텐츠로 제공합니다.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          복잡한 운동 용어 없이, 오늘 바로 실천할 수 있는 다이어트·운동 가이드를 매일 5편씩 발행합니다.
        </p>
      </section>

      {/* 주제별 카테고리 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>다루는 운동·다이어트 주제</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOPICS.map((t) => (
            <Link
              key={t.name}
              href={t.query ? `/search?q=${encodeURIComponent(t.query)}` : `/${t.slug}`}
              className="card p-5 flex gap-4 items-start hover:opacity-80 transition-opacity"
            >
              <span className="text-3xl">{t.icon}</span>
              <div>
                <h3 className="font-bold mb-1" style={{ color: 'var(--text)' }}>{t.name}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 이 블로그의 특징 */}
      <section className="card p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>이 블로그의 특징</h2>
        <ul className="space-y-4">
          {[
            { icon: '📅', text: '매일 5편 · 365일 꾸준히 발행되는 다이어트·운동 정보' },
            { icon: '🏅', text: '국가공인 스포츠지도사·영양사 수준의 과학적 근거 기반 콘텐츠' },
            { icon: '📱', text: '30~50대에 최적화된 직관적·모바일 친화 디자인' },
            { icon: '📋', text: '목차 제공으로 긴 글도 원하는 부분만 빠르게 탐색' },
            { icon: '🎬', text: '유튜브 쇼츠·롱폼 영상으로 이동 중에도 운동 정보 확인' },
            { icon: '🔍', text: '검색·관련 글 추천으로 더 깊은 운동·다이어트 정보 탐색' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="text-2xl">{icon}</span>
              <span className="text-base" style={{ color: 'var(--text-muted)' }}>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 면책 조항 */}
      <section className="card p-6 mb-8" style={{ borderLeft: '4px solid var(--primary)' }}>
        <h2 className="font-bold mb-2" style={{ color: 'var(--text)' }}>면책 조항</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          본 블로그의 건강·의학 관련 콘텐츠는 일반적인 정보 제공 목적으로 작성되었으며,
          전문 의료 조언을 대체하지 않습니다. 건강 관련 결정은 반드시 전문 의료인과 상담하시기 바랍니다.
        </p>
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link href="/" className="btn-primary inline-block px-8 py-3 rounded-xl text-base">
          최신 건강 글 보러 가기
        </Link>
      </div>
    </div>
  );
}
