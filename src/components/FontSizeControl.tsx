'use client';
import { useEffect, useState } from 'react';

const SIZES = [
  { label: '소', value: 0.9 },
  { label: '중', value: 1 },
  { label: '대', value: 1.15 },
];

export default function FontSizeControl() {
  const [size, setSize] = useState(1);

  useEffect(() => {
    const saved = parseFloat(localStorage.getItem('fontScale') || '1');
    setSize(saved);
    document.documentElement.style.setProperty('--font-scale', String(saved));
  }, []);

  const apply = (val: number) => {
    setSize(val);
    document.documentElement.style.setProperty('--font-scale', String(val));
    localStorage.setItem('fontScale', String(val));
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      <span style={{ color: 'var(--text-muted)' }}>글씨</span>
      {SIZES.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => apply(value)}
          className="px-2 py-1 rounded transition-colors"
          style={{
            background: size === value ? 'var(--primary)' : 'var(--bg-bar)',
            color: size === value ? 'white' : 'var(--text)',
            fontWeight: size === value ? 600 : 400,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
