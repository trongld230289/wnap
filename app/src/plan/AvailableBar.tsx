import { barFill } from '../budget/barFill';
import { formatVnd } from '../budget/format';
import { STATUS_TEXT, STATUS_BAR_BG } from '../ui/statusColor';
import { cn } from '@/lib/utils';
import type { PlanRow } from '../engine';

export function AvailableBar({ row }: { row: PlanRow }) {
  const { pct, color } = barFill(row);
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', STATUS_BAR_BG[color])} style={{ width: `${pct * 100}%` }} />
      </span>
      <span className={cn('min-w-[80px] text-right font-semibold tabular-nums', STATUS_TEXT[color])}>
        {formatVnd(row.available)}
      </span>
    </span>
  );
}
