import { useEffect, useRef, useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { cn } from '@/lib/utils';
import { Count } from '../delight/Count';
import { useDelight } from '../delight/useDelight';
import { usePrevious } from '../delight/usePrevious';
import { detectRtaSignal } from '../delight/signals';

export function RtaHeader({ onAssign }: { onAssign: () => void }) {
  const { rta } = useBudget();
  const { enabled } = useDelight();
  const tone = rta < 0 ? 'bg-status-red' : rta === 0 ? 'bg-status-gray' : 'bg-primary';

  const prevRta = usePrevious(rta);
  const [fx, setFx] = useState<'' | 'pay' | 'emit'>('');
  const timer = useRef(0);

  useEffect(() => {
    if (!enabled || prevRta === undefined) return;
    const sig = detectRtaSignal(prevRta, rta);
    if (sig === 'none') return;
    setFx(sig === 'payday' ? 'pay' : 'emit');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFx(''), 750);
    return () => clearTimeout(timer.current);
  }, [rta, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-full px-4 py-2 text-primary-foreground shadow-sm',
        tone,
        fx === 'pay' && 'dl-bump dl-glow',
        fx === 'emit' && 'dl-emit',
      )}
    >
      <span className="dl-ripple" aria-hidden />
      <span className="font-semibold">
        Sẵn sàng phân bổ: <Count value={rta} suffix="₫" />
      </span>
      <button onClick={onAssign} className="rounded-md bg-white/20 px-2 py-0.5 text-sm font-medium hover:bg-white/30">＋ Assign</button>
    </div>
  );
}
