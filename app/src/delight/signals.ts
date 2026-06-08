import type { BarColor } from '../budget/barFill';

export type RowSnapshot = { color: BarColor; assigned: number };
export type RowSignal = 'assign' | 'target-reached' | 'cover' | 'none';
export type RtaSignal = 'payday' | 'spend-assign' | 'none';

/** Suy ra loại celebration cho 1 category từ trạng thái render trước → hiện tại. */
export function detectRowSignal(prev: RowSnapshot, next: RowSnapshot): RowSignal {
  if (prev.color === 'yellow' && next.color === 'green') return 'target-reached';
  if (prev.color === 'red' && next.color !== 'red') return 'cover';
  if (next.assigned > prev.assigned) return 'assign';
  return 'none';
}

/** RTA tăng → nạp tiền (payday); giảm → vừa phân bổ (assign). */
export function detectRtaSignal(prev: number, next: number): RtaSignal {
  if (next > prev) return 'payday';
  if (next < prev) return 'spend-assign';
  return 'none';
}
