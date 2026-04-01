'use client';
import { useEffect, useState } from 'react';

interface Stats {
  todayViews: number;
  totalViews: number;
  todayUnique: number;
  totalUnique: number;
}

export default function VisitorStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // 오늘 방문 기록 (sessionStorage로 중복 방지)
    const key = `visited_${new Date().toISOString().slice(0, 10)}`;
    const isNew = !sessionStorage.getItem(key);

    fetch('/api/visitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isUnique: isNew }),
    }).then(() => {
      if (isNew) sessionStorage.setItem(key, '1');
    });

    // 통계 조회
    fetch('/api/visitors')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
        방문자 통계
      </p>
      <div className="grid grid-cols-2 gap-3">
        <StatItem label="오늘 방문" value={stats.todayUnique} icon="👤" />
        <StatItem label="오늘 조회" value={stats.todayViews} icon="👁️" />
        <StatItem label="누적 방문" value={stats.totalUnique} icon="📊" />
        <StatItem label="누적 조회" value={stats.totalViews} icon="📈" />
      </div>
    </div>
  );
}

function StatItem({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="text-center py-2">
      <div className="text-lg">{icon}</div>
      <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
