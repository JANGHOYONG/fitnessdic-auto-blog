import Link from 'next/link';
import AddToHomeScreen from './AddToHomeScreen';

const TOPICS = [
  { name: '체중감량', query: '체중감량' },
  { name: '근력운동', query: '근력운동' },
  { name: '유산소·러닝', query: '유산소' },
  { name: '식단·영양', query: '식단' },
  { name: '홈트레이닝', query: '홈트' },
  { name: '다이어트 식품', query: '보충제' },
  { name: '바디프로필', query: '바디프로필' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16" style={{ background: '#EDE5D8' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-3 text-stone-700 flex items-center gap-2">
              <span>💪</span> 다이어트·운동 백과
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#4A3F33' }}>
              30·40·50대를 위한<br />
              과학적 다이어트·운동 정보를 제공합니다.<br />
              체중감량·근력·식단·홈트 정보까지.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-stone-700">운동 주제</h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {TOPICS.map((t) => (
                <li key={t.query}>
                  <Link
                    href={`/search?q=${encodeURIComponent(t.query)}`}
                    className="text-sm hover:text-stone-700 transition-colors"
                    style={{ color: '#4A3F33' }}
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/health" className="text-sm hover:text-stone-700 transition-colors" style={{ color: '#4A3F33' }}>
                  전체 글 보기
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-stone-700">바로가기</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/about', label: '블로그 소개' },
                { href: '/privacy', label: '개인정보처리방침' },
                { href: '/search', label: '검색' },
                { href: '/sitemap.xml', label: '사이트맵' },
                { href: '/api/rss', label: 'RSS 피드' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-stone-700 transition-colors" style={{ color: '#4A3F33' }}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <AddToHomeScreen />
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-6 text-sm text-center" style={{ borderColor: '#C8B89A', color: '#4A3F33' }}>
          <p>© {year} 다이어트·운동 백과. All rights reserved.</p>
          <p className="mt-1">본 사이트의 운동·다이어트 정보는 참고용이며, 부상이 있을 경우 반드시 전문의와 상담하시기 바랍니다.</p>
          <p className="mt-2">
            <Link href="/privacy" className="hover:text-stone-700 transition-colors mx-2" style={{ color: '#4A3F33' }}>개인정보처리방침</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <Link href="/about" className="hover:text-stone-700 transition-colors mx-2" style={{ color: '#4A3F33' }}>블로그 소개</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
