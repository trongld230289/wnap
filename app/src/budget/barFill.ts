import { categoryStatus } from '../engine';
import type { PlanRow } from '../engine';

export type BarColor = 'red' | 'yellow' | 'green' | 'gray';

export interface BarFill { pct: number; color: BarColor; }

/** Map status engine → màu + độ đầy thanh Available (spec §3). */
export function barFill(row: PlanRow): BarFill {
  const status = categoryStatus(row);
  if (status === 'red') return { pct: 1, color: 'red' };
  if (status === 'gray' || status === 'gray-snoozed') return { pct: 0, color: 'gray' };
  // yellow | green
  const color: BarColor = status;
  if (row.target) {
    const pct = Math.max(0, Math.min(1, row.available / row.target.amount));
    return { pct, color };
  }
  return { pct: 1, color }; // green không target nhưng có tiền
}
