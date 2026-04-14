import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '블로그 소개 | 다이어트·운동 백과',
  description: '다이어트·운동 백과는 국민체육진흥공단·대한스포츠의학회 데이터를 기반으로 30·40·50대에게 신뢰할 수 있는 과학적 다이어트·운동 정보를 제공하는 전문 블로그입니다.',
};

const TOPICS = [
  { icon: '🔥', name: '체중감량', slug: 'fitness', query: '체중감량', desc: '지방연소·요요 방지, 간헐적 단식·칼로리 계산 과학적 가이드' },
  { icon: '💪', name: '근력운동', slug: 'fitness', query: '근력운동', desc: '스쿼트·데드리프트·벤치프레스, 근비대 분할 루틴 완벽 가이드' },
  { icon: '🏃', name: '유산소·러닝', slug: 'fitness', query: '유산소', desc: '지방 연소 최적 유산소, 달리기 입문·마라톤 준비법' },
  { icon: '🥗', name: '식단·영양', slug: 'fitness', query: '식단', desc: '다이어트 식단 설계, 단백질·칼로리 계산, 운동 전후 영양 타이밍' },
  { icon: '🏠', name: '홈트레이닝', slug: 'fitness', query: '홈트', desc: '기구 없이 집에서 하는 맨몸운동·홈트 루틴 완전 가이드' },
  { icon: '📸', name: '바디프로필·동기', slug: 'fitness', query: '바디프로필', desc: '바디프로필 준비, 운동 습관 만들기, 다이어트 동기 유지법' },
];

const EDITORS = [
  {
    emoji: '🏋️',
    name: '김태준 에디터',
    career: '국가공인 생활스포츠지도사 1급 · 퍼스널트레이너 10년 · 운동 칼럼니스트',
    specialty: '체중감량 / 근력운동 / 홈트레이닝',
    desc: '국민체육진흥공단·대한체육회 데이터를 기반으로 연령대별 안전하고 효과적인 운동법을 기획합니다.',
  },
  {
    emoji: '👩‍🔬',
    name: '정유나 에디터',
    career: '임상영양사 · 스포츠영양학 석사 · 영양 칼럼 연재 7년',
    specialty: '식단·영양 / 다이어트 식품 / 보충제',
    desc: '국민건강영양조사·한국영양학회 기준을 참고해 30~50대 맞춤 식단·영양 정보를 작성합니다.',
  },
  {
    emoji: '🏃‍♀️',
    name: '오승현 에디터',
    career: '운동생리학 박사과정 · 마라톤 완주 8회 · 피트니스 코치 6년',
    specialty: '유산소·러닝 / 바디프로필 / 운동 동기',
    desc: '대한스포츠의학회 가이드라인을 근거로 유산소·러닝의 과학적 원리와 실전 훈련법을 전달합니다.',
  },
];

const SOURCES = [
  { name: '국민체육진흥공단', url: 'https://www.kspo.or.kr', desc: '국민 체력 실태조사, 운동 가이드라인' },
  { name: '한국영양학회', url: 'https://www.kns.or.kr', desc: '한국인 영양소 섭취기준(KDRIs)' },
  { name: '국민건강영양조사', url: 'https://knhanes.kdca.go.kr', desc: '비만·체중 관련 국가 통계' },
  { name: '대한스포츠의학회', url: 'https://www.kssm.or.kr', desc: '운동 처방·스포츠 의학 가이드' },
  { name: '질병관리청 만성질환', url: 'https://www.kdca.go.kr', desc: '비만·대사증후군 현황 통계' },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* 헤더 */}
      <div className="text-center mb-12">
        <p className="text-5xl mb-4">💪</p>
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>다이어트·운동 백과</h1>
        <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>
          30·40·50대를 위한 과학적 다이어트·운동 전문 블로그
        </p>
        <div className="flex justify-center gap-6 text-sm mt-4 flex-wrap">
          <span className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>
            <strong>📅</strong> 2024년 운영 시작
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>
            <strong>📝</strong> 누적 발행 글 300편+
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>
            <strong>🗂️</strong> 운동·다이어트 6대 주제 전문
          </span>
        </div>
      </div>

      {/* 운영 목적 */}
      <section className="card p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>왜 이 블로그를 만들었나요?</h2>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          국민건강영양조사에 따르면 30~50대 성인의 비만율은 매년 증가하고 있습니다.
          그러나 인터넷에는 검증되지 않은 원푸드 다이어트, 과장된 보충제 광고, 부상 위험이 있는
          무리한 운동법이 넘쳐납니다.
        </p>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>다이어트·운동 백과</strong>는 국민체육진흥공단·한국영양학회 등
          국내 공인 기관의 데이터를 근거로, 전문 트레이너·영양사 출신 에디터가 검수한 콘텐츠만 발행합니다.
          "단기간에 OO kg 감량"과 같은 과장 표현은 사용하지 않으며,
          개인의 체력 수준과 건강 상태에 따른 차이를 항상 명시합니다.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          복잡한 운동 용어 없이, 오늘 바로 실천할 수 있는 다이어트·운동 가이드를 매일 제공합니다.
        </p>
      </section>

      {/* 에디터팀 소개 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>에디터·콘텐츠 감수팀</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          모든 글은 아래 전문가 에디터가 기획·검수합니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EDITORS.map((e) => (
            <div key={e.name} className="card p-6 flex flex-col gap-3">
              <div className="text-4xl text-center">{e.emoji}</div>
              <div className="text-center">
                <p className="font-bold text-base" style={{ color: 'var(--text)' }}>{e.name}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--primary)' }}>{e.career}</p>
              </div>
              <div
                className="text-xs px-3 py-1 rounded-full text-center"
                style={{ background: 'var(--bg-bar)', color: 'var(--text)' }}
              >
                {e.specialty}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 콘텐츠 제작 프로세스 */}
      <section className="card p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>콘텐츠 제작 원칙</h2>
        <ol className="space-y-5">
          {[
            {
              step: '01',
              title: '공인 데이터 기반 기획',
              desc: '국민체육진흥공단·한국영양학회·국민건강영양조사 등 국가 공식 통계를 먼저 확인합니다.',
            },
            {
              step: '02',
              title: '스포츠 의학 가이드라인 참조',
              desc: '대한스포츠의학회·한국운동생리학회 가이드라인을 참고해 운동 처방의 정확성을 검증합니다.',
            },
            {
              step: '03',
              title: '전문가 에디터 검수',
              desc: '트레이너·영양사·운동생리학 전문가 에디터가 과장·오류 여부를 최종 확인한 후 발행합니다.',
            },
            {
              step: '04',
              title: '개인차 및 주의사항 필수 삽입',
              desc: '모든 글 하단에 "개인 체력·건강 상태에 따라 차이가 있으며, 부상 위험 시 전문가 상담 필수" 문구를 반드시 포함합니다.',
            },
            {
              step: '05',
              title: '정기 업데이트',
              desc: '새로운 연구 결과 또는 가이드라인 개정 시 기존 글을 수정·보완합니다.',
            },
          ].map(({ step, title, desc }) => (
            <li key={step} className="flex gap-4 items-start">
              <span
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--primary)', color: '#fff' }}
              >
                {step}
              </span>
              <div>
                <p className="font-bold mb-1" style={{ color: 'var(--text)' }}>{title}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 주요 참고 데이터 출처 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>주요 참고 데이터 출처</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          다이어트·운동 백과는 아래 국내 공인 스포츠·영양 기관의 자료를 참고합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOURCES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-4 flex items-start gap-3 hover:opacity-80 transition-opacity"
            >
              <span className="text-xl">🔗</span>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--primary)' }}>{s.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 다루는 주제 */}
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
            { icon: '🏅', text: '전문 트레이너·영양사 출신 에디터가 기획·검수한 과학적 근거 기반 콘텐츠' },
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

      {/* 문의·피드백 */}
      <section className="card p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>문의 및 피드백</h2>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          콘텐츠 오류 제보, 특정 운동·다이어트 주제 요청, 광고·제휴 문의는 아래 이메일로 연락 주세요.
          독자분의 피드백은 콘텐츠 품질 향상에 직접 반영됩니다.
        </p>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">📧</span>
            <span style={{ color: 'var(--text)' }}>
              콘텐츠 오류 / 주제 요청:{' '}
              <a
                href="mailto:contact@fitnessdic.co.kr"
                className="underline"
                style={{ color: 'var(--primary)' }}
              >
                contact@fitnessdic.co.kr
              </a>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">💼</span>
            <span style={{ color: 'var(--text)' }}>
              광고·제휴 문의:{' '}
              <a
                href="mailto:biz@fitnessdic.co.kr"
                className="underline"
                style={{ color: 'var(--primary)' }}
              >
                biz@fitnessdic.co.kr
              </a>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <span style={{ color: 'var(--text-muted)' }}>영업일 기준 1~3일 내 답변 드립니다.</span>
          </div>
        </div>
      </section>

      {/* 면책 조항 (강화) */}
      <section
        className="card p-6 mb-8"
        style={{ borderLeft: '4px solid var(--primary)' }}
      >
        <h2 className="font-bold mb-3 text-base" style={{ color: 'var(--text)' }}>⚠️ 주의 사항 (중요)</h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
          본 블로그의 다이어트·운동 콘텐츠는 <strong style={{ color: 'var(--text)' }}>일반적인 건강 정보 제공</strong>을
          목적으로 작성되었으며, 의사·영양사·운동 처방사 등 전문가의 개인 맞춤 지도를 대체하지 않습니다.
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
          체력 수준, 기저질환, 부상 이력에 따라 동일한 운동·식단이 개인마다 다른 결과를 낳을 수 있습니다.
          특히 고혈압·당뇨·관절 질환이 있는 경우 <strong style={{ color: 'var(--text)' }}>운동 시작 전 반드시 담당 의사와 상담</strong>하시기 바랍니다.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          본 블로그는 특정 제품·서비스의 효능을 보증하지 않으며, 콘텐츠 적용으로 인한 결과에 대해
          법적 책임을 지지 않습니다.
        </p>
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link href="/" className="btn-primary inline-block px-8 py-3 rounded-xl text-base">
          최신 운동·다이어트 글 보러 가기
        </Link>
      </div>

    </div>
  );
}
