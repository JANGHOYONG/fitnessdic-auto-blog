import Link from 'next/link';
import { Post, Category } from '@prisma/client';

type PostWithCategory = Post & { category: Category };

interface Props {
  posts: PostWithCategory[];
  currentSlug: string;
}

export default function RelatedPosts({ posts, currentSlug }: Props) {
  const filtered = posts.filter((p) => p.slug !== currentSlug).slice(0, 4);

  if (filtered.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-xl font-bold mb-6">관련 글</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((post) => (
          <Link
            key={post.id}
            href={`/${post.category.slug}/${post.slug}`}
            className="flex gap-3 p-4 bg-white rounded-xl border hover:border-primary-300 hover:shadow-sm transition-all group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary-600 mb-1">{post.category.name}</p>
              <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 text-sm leading-snug">
                {post.title}
              </h3>
              <p className="text-xs text-gray-400 mt-2 line-clamp-1">
                {post.excerpt}
              </p>
            </div>
            <span className="text-gray-300 group-hover:text-primary-400 transition-colors flex-shrink-0 self-center">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
