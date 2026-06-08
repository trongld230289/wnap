import type { CSSProperties } from 'react';

const PARTS = [
  { tx: '14px', ty: '-16px', bg: 'var(--status-green)', delay: '0s' },
  { tx: '-10px', ty: '-20px', bg: 'var(--status-amber)', delay: '.05s' },
  { tx: '18px', ty: '-2px', bg: '#7c5cff', delay: '.08s' },
  { tx: '-16px', ty: '-10px', bg: 'var(--status-green)', delay: '.04s' },
];

/** Burst 4 hạt nhỏ; render khi show=true (parent tự tắt sau SPARKLE_MS). */
export function Sparkle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="dl-sparkle" aria-hidden>
      {PARTS.map((p, i) => (
        <i
          key={i}
          style={{ '--tx': p.tx, '--ty': p.ty, background: p.bg, animationDelay: p.delay } as CSSProperties}
        />
      ))}
    </span>
  );
}
