import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '블로그 소개 | 시니어 건강백과',
  description: '50·60대 중장년층을 위한 건강 정보 블로그 시니어 건강백과를 소개합니다.',
};

const TOPICS = [
  { icon: '🩸', name: '혈당·당뇨', slug: 'health', query: '혈당', desc: '공복혈당·당화혈색소 관리, 식후 혈당 낮추는 식단과 생활 습관' },
  { icon: '❤️', name: '혈압·심장', slug: 'health', query: '혈압', desc: '고혈압·심혈관 질환 예방, 콜레스테롤·동맥경화 관리 가이드' },
  { icon: '🦵', name: '관절·근육', slug: 'health', query: '관절', desc: '무릎·허리 통증 완화, 근감소증 예방, 골다공증 관리' },
  { icon: '😴', name: '수면·피로', slug: 'health', query: '수면', desc: '불면증 해소, 수면의 질 개선, 만성피로 극복 방법' },
  { icon: '🧠', name: '뇌건강·치매', slug: 'health', query: '치매', desc: '치매·알츠하이머 예방, 기억력 강화, 뇌 건강 유지 비결' },
  { icon: '🌸', name: '갱년기', slug: 'health', query: '갱년기', desc: '갱년기 증상 완화, 호르몬 균형, 여성·남성 갱년기 건강 관리' },
  { icon: '🥗', name: '영양·식이', slug: 'health', query: '영양', desc: '시니어 맞춤 영양제, 건강식품, 식단 설계 가이드' },
  { icon: '✈️', name: '여행·여가', slug: 'travel', query: '', desc: '시니어 친화 여행지·코스 추천, 건강한 여가생활 노하우' },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* 헤더 */}
      <div className="text-center mb-12">
        <p className="text-5xl mb-4">🏥</p>
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>시니어 건강백과</h1>
        <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
          50·60대를 위한 신뢰할 수 있는 건강 정보
        </p>
      </div>

      {/* 소개 */}
      <section className="card p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>안녕하세요 👋</h2>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>시니어 건강백과</strong>는 50·60대 중장년층이
          건강하고 활기찬 노후를 보낼 수 있도록 돕는 건강 정보 전문 블로그입니다.
        </p>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          혈당·혈압·관절·수면·뇌건강·갱년기·영양까지, 중장년에게 꼭 필요한 7대 건강 주제를
          매일 전문의 수준의 근거 기반 콘텐츠로 제공합니다.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          복잡한 의학 용어 없이, 오늘 바로 실천할 수 있는 생활 습관 가이드를 매일 5편씩 발행합니다.
        </p>
      </section>

      {/* 주제별 카테고리 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>다루는 건강 주제</h2>
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
            { icon: '📅', text: '매일 5편 · 365일 꾸준히 발행되는 건강 정보' },
            { icon: '🩺', text: '전문의 수준의 근거 기반 콘텐츠, 쉬운 언어로 풀어쓴 설명' },
            { icon: '📱', text: '50·60대에 최적화된 큰 글씨, 모바일 친화 디자인' },
            { icon: '📋', text: '목차 제공으로 긴 글도 원하는 부분만 빠르게 탐색' },
            { icon: '🎬', text: '유튜브 쇼츠·롱폼 영상으로 이동 중에도 건강 정보 확인' },
            { icon: '🔍', text: '검색·관련 글 추천으로 더 깊은 건강 정보 탐색' },
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
