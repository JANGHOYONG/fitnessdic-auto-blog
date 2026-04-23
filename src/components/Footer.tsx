import Link from 'next/link';
import AddToHomeScreen from './AddToHomeScreen';

const CONTENT_LINKS = [
  { name: '다이어트', href: '/diet' },
  { name: '운동·헬스', href: '/exercise' },
  { name: '홈트레이닝', href: '/hometraining' },
  { name: '러닝·유산소', href: '/running' },
  { name: '식단·영양', href: '/nutrition' },
  { name: '영양제·이너뷰티', href: '/supplement' },
  { name: '생활건강', href: '/health' },
  { name: '스킨케어', href: '/skincare' },
  { name: '뷰티·메이크업', href: '/beauty' },
  { name: '바디프로필·동기', href: '/motivation' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16" style={{ background: '#F5EDE4', borderTop: '1px solid #EFE6DC' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          {/* 열 1 — 사이트 소개 */}
          <div>
            <h3 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: '#1E1511' }}>
              <span>💪💄🥗</span> 다이어트·건강 백과
            </h3>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#4A3F33' }}>
              <em>과학으로 가볍게, 습관으로 꾸준히.</em><br />
              20~40대를 위한 다이어트·건강·피부미용 정보.
            </p>
            <ul className="space-y-1.5 text-sm" style={{ color: '#4A3F33' }}>
              <li><Link href="/about" className="hover:underline" style={{ color: '#4A3F33' }}>편집부 소개</Link></li>
              <li><Link href="/about#editorial" className="hover:underline" style={{ color: '#4A3F33' }}>편집 기준</Link></li>
              <li><Link href="/contact" className="hover:underline" style={{ color: '#4A3F33' }}>문의하기</Link></li>
            </ul>
          </div>

          {/* 열 2 — 콘텐츠 */}
          <div>
            <h4 className="font-semibold mb-3 text-sm" style={{ color: '#1E1511' }}>콘텐츠</h4>
            <ul className="space-y-1.5">
              {CONTENT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:underline" style={{ color: '#4A3F33' }}>
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 열 3 — 정책 */}
          <div>
            <h4 className="font-semibold mb-3 text-sm" style={{ color: '#1E1511' }}>정책</h4>
            <ul className="space-y-1.5 text-sm">
              {[
                { href: '/privacy',    label: '개인정보처리방침' },
                { href: '/terms',      label: '이용약관' },
                { href: '/disclaimer', label: '의료 면책 고지' },
                { href: '/sitemap.xml', label: '사이트맵' },
                { href: '/feed.xml',   label: 'RSS 피드' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:underline" style={{ color: '#4A3F33' }}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 열 4 — 연결 */}
          <div>
            <h4 className="font-semibold mb-3 text-sm" style={{ color: '#1E1511' }}>연결</h4>
            <ul className="space-y-1.5 text-sm" style={{ color: '#4A3F33' }}>
              <li>
                <a
                  href="https://www.youtube.com/@smartinfohealth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: '#4A3F33' }}
                >
                  📺 유튜브 채널
                </a>
              </li>
              <li>
                <Link href="/search" className="hover:underline" style={{ color: '#4A3F33' }}>🔍 글 검색</Link>
              </li>
              <li>
                <AddToHomeScreen />
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 저작권 */}
        <div className="border-t pt-6 text-sm text-center space-y-1" style={{ borderColor: '#C8B89A', color: '#6B5540' }}>
          <p>© {year} 다이어트·건강 백과 · 대표: JANG HOYONG · 문의: ghdyd6913@gmail.com</p>
          <p className="text-xs" style={{ color: '#8A7A66' }}>
            본 사이트의 정보는 일반 정보 제공 목적이며, 의료·영양 전문가의 상담을 대체하지 않습니다.
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="hover:underline mx-2" style={{ color: '#6B5540' }}>개인정보처리방침</Link>
            <span style={{ color: '#C8B89A' }}>|</span>
            <Link href="/terms" className="hover:underline mx-2" style={{ color: '#6B5540' }}>이용약관</Link>
            <span style={{ color: '#C8B89A' }}>|</span>
            <Link href="/disclaimer" className="hover:underline mx-2" style={{ color: '#6B5540' }}>면책 고지</Link>
            <span style={{ color: '#C8B89A' }}>|</span>
            <Link href="/about" className="hover:underline mx-2" style={{ color: '#6B5540' }}>편집부 소개</Link>
          </p>
          <p className="text-xs mt-1" style={{ color: '#8A7A66' }}>
            이 포스팅은 쿠팡파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
