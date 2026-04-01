'use client';
import { useEffect, useState } from 'react';

interface Heading { id: string; text: string; }

interface Props { headings: Heading[]; }

export default function TOC({ headings }: Props) {
  const [active, setActive] = useState('');

  useEffect(() => {
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav className="card p-4 sticky top-20 text-sm">
      <p className="font-bold mb-3" style={{ color: 'var(--text)' }}>목차</p>
      <ol className="space-y-2">
        {headings.map(({ id, text }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="block leading-snug transition-colors"
              style={{
                color: active === id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: active === id ? 600 : 400,
              }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
