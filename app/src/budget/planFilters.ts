import {
  isOverspent, isUnderfunded, isOverfunded, isMoneyAvailable, isSnoozed,
} from '../engine';
import type { PlanRow } from '../engine';

export type FilterId = 'overspent' | 'underfunded' | 'overfunded' | 'moneyAvailable' | 'snoozed';

export interface PlanFilter {
  id: FilterId;
  label: string;
  predicate: (r: PlanRow) => boolean;
}

export const PLAN_FILTERS: PlanFilter[] = [
  { id: 'overspent', label: 'Overspent', predicate: isOverspent },
  { id: 'underfunded', label: 'Underfunded', predicate: isUnderfunded },
  { id: 'overfunded', label: 'Overfunded', predicate: isOverfunded },
  { id: 'moneyAvailable', label: 'Money Available', predicate: isMoneyAvailable },
  { id: 'snoozed', label: 'Snoozed', predicate: isSnoozed },
];

export function filterCounts(rows: PlanRow[]): Record<FilterId, number> {
  const out = { overspent: 0, underfunded: 0, overfunded: 0, moneyAvailable: 0, snoozed: 0 } as Record<FilterId, number>;
  for (const f of PLAN_FILTERS) out[f.id] = rows.filter(f.predicate).length;
  return out;
}
