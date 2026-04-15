'use client';

import { useEffect, useRef } from 'react';

interface Props {
  unit: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function AdFit({ unit, width = 320, height = 50, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!unit || initialized.current) return;
    if (!containerRef.current) return;
    initialized.current = true;

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', String(width));
    ins.setAttribute('data-ad-height', String(height));
    containerRef.current.appendChild(ins);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    containerRef.current.appendChild(script);

    return () => { initialized.current = false; };
  }, [unit, width, height]);

  if (!unit) return null;

  return (
    <div
      ref={containerRef}
      className={`adfit-wrap ${className}`}
      style={{ overflow: 'hidden', maxWidth: '100%', textAlign: 'center', margin: '8px 0' }}
    />
  );
}
