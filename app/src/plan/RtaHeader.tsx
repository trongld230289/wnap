import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import { cn } from '@/lib/utils';

export function RtaHeader({ onAssign }: { onAssign: () => void }) {
  const { rta } = useBudget();
  const tone = rta < 0 ? 'bg-status-red' : rta === 0 ? 'bg-status-gray' : 'bg-primary';
  return (
    <div className={cn('flex items-center gap-3 rounded-full px-4 py-2 text-primary-foreground shadow-sm', tone)}>
      <span className="font-semibold">Sẵn sàng phân bổ: <span className="tabular-nums">{formatVnd(rta)}₫</span></span>
      <button onClick={onAssign} className="rounded-md bg-white/20 px-2 py-0.5 text-sm font-medium hover:bg-white/30">＋ Assign</button>
    </div>
  );
}
