'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import SkeletonCard from '@/components/SkeletonCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.posts || []);
    setLoading(false);
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--text)' }}>검색</h1>

      {/* 검색창 */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어를 입력하세요..."
          className="flex-1 px-4 py-3 rounded-xl border text-base outline-none"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        />
        <button type="submit" className="btn-primary px-6 py-3 rounded-xl">
          검색
        </button>
      </form>

      {/* 결과 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : searched ? (
        results.length > 0 ? (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              "{searchParams.get('q')}" 검색 결과 {results.length}개
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((post: any) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <p className="text-lg">검색 결과가 없습니다.</p>
            <p className="text-sm mt-2">다른 키워드로 검색해보세요.</p>
          </div>
        )
      ) : (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <p>검색어를 입력하세요 (2글자 이상)</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
