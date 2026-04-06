import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-6xl mb-4">🔍</p>
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--text-muted)' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--primary)' }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
