import { barFill } from '../budget/barFill';
import { STATUS_TEXT, STATUS_BAR_BG } from '../ui/statusColor';
import { cn } from '@/lib/utils';
import { Count } from '../delight/Count';
import type { PlanRow } from '../engine';

export function AvailableBar({ row }: { row: PlanRow }) {
  const { pct, color } = barFill(row);
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-2 w-20 overflow-hidden rounded-full bg-muted sm:inline-block">
        <span
          className={cn('block h-full rounded-full transition-[width,background-color] duration-700 ease-out', STATUS_BAR_BG[color])}
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className={cn('min-w-[64px] text-right font-semibold tabular-nums transition-colors duration-500 sm:min-w-[80px]', STATUS_TEXT[color])}>
        <Count value={row.available} />
      </span>
    </span>
  );
}
