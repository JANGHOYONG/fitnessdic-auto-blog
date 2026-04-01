import Link from 'next/link';
import { Post, Category } from '@prisma/client';

type PostWithCategory = Post & { category: Category };

const CAT_GRADIENT: Record<string, string> = {
  health:    'from-green-400 to-emerald-600',
  tech:      'from-blue-400 to-sky-600',
  economy:   'from-yellow-400 to-amber-600',
  lifestyle: 'from-pink-400 to-rose-600',
  travel:    'from-purple-400 to-violet-600',
};

const CAT_BADGE: Record<string, string> = {
  health:    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  tech:      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  economy:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  lifestyle: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  travel:    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

interface Props {
  post: PostWithCategory;
  size?: 'default' | 'compact';
}

export default function ArticleCard({ post, size = 'default' }: Props) {
  const href = `/${post.category.slug}/${post.slug}`;
  const gradient = CAT_GRADIENT[post.category.slug] || 'from-gray-400 to-gray-600';
  const badge    = CAT_BADGE[post.category.slug]    || 'bg-gray-100 text-gray-600';

  if (size === 'compact') {
    return (
      <article className="flex gap-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-0">
          <Link href={href} className="text-sm font-medium line-clamp-2 block hover:opacity-75 transition-opacity" style={{ color: 'var(--text)' }}>
            {post.title}
          </Link>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {post.publishedAt?.toLocaleDateString('ko-KR')}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card group flex flex-col">
      {/* 썸네일 그라디언트 */}
      <div className={`h-32 bg-gradient-to-br ${gradient} flex items-end p-4 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.4%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <span className={`category-badge text-xs relative z-10 ${badge}`}>
          {post.category.name}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* 날짜 */}
        {post.publishedAt && (
          <time className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            {post.publishedAt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
        )}

        {/* 제목 */}
        <h2 className="font-bold mb-2 line-clamp-2 leading-snug group-hover:opacity-75 transition-opacity flex-1" style={{ color: 'var(--text)' }}>
          <Link href={href}>{post.title}</Link>
        </h2>

        {/* 요약 */}
        <p className="text-sm line-clamp-2 leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          {post.excerpt}
        </p>

        {/* 메타 */}
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex gap-3">
            {post.readTime && <span>⏱ {post.readTime}분</span>}
            <span>👁 {post.viewCount.toLocaleString()}</span>
          </div>
          <Link href={href} className="font-medium hover:opacity-75 transition-opacity" style={{ color: 'var(--primary)' }}>
            더 읽기 →
          </Link>
        </div>
      </div>
    </article>
  );
}
