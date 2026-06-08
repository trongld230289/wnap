import { useEffect, useRef, useState } from 'react';
import { formatVnd } from '../budget/format';
import { useDelight } from './useDelight';
import { COUNT_MS, easeOutCubic } from './motion';

/** Hiển thị số tiền, count-up có gia tốc khi đổi giá trị; tôn trọng reduced-motion. */
export function Count({ value, suffix = '' }: { value: number; suffix?: string }) {
  const { enabled } = useDelight();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled || fromRef.current === value) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const p = Math.min((now - t0) / COUNT_MS, 1);
      setDisplay(from + (value - from) * easeOutCubic(p));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, enabled]);

  return <span className="tabular-nums">{formatVnd(Math.round(display))}{suffix}</span>;
}
