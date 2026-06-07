import type { PlanRow } from './types';

export type CategoryStatus = 'red' | 'yellow' | 'green' | 'gray-snoozed' | 'gray';

/** Thứ tự ưu tiên màu theo spec §4c. */
export function categoryStatus(r: PlanRow): CategoryStatus {
  if (r.available < 0) return 'red';
  if (r.snoozed && r.target) return 'gray-snoozed';
  if (r.target && r.needed - r.assigned > 0) return 'yellow';
  if (r.target || r.available > 0) return 'green';
  return 'gray';
}
