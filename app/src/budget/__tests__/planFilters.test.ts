import { expect, test } from 'vitest';
import { PLAN_FILTERS, filterCounts } from '../planFilters';
import type { PlanRow } from '../../engine';

function row(p: Partial<PlanRow> & { categoryId: string }): PlanRow {
  return { kind: 'need', startBalance: 0, assigned: 0, activity: 0, available: 0, target: null, needed: 0, snoozed: false, ...p };
}

const rows: PlanRow[] = [
  row({ categoryId: 'a', available: -50 }),                                   // overspent
  row({ categoryId: 'b', target: { categoryId: 'b', strategy: 'set_aside', amount: 100, cadence: 'monthly' }, needed: 100, assigned: 40, available: 40 }), // underfunded + moneyAvail
  row({ categoryId: 'c', snoozed: true }),                                    // snoozed
];

test('PLAN_FILTERS có đúng 5 thẻ theo thứ tự', () => {
  expect(PLAN_FILTERS.map((f) => f.id)).toEqual(['overspent', 'underfunded', 'overfunded', 'moneyAvailable', 'snoozed']);
});

test('filterCounts đếm đúng số row khớp từng filter', () => {
  expect(filterCounts(rows)).toEqual({ overspent: 1, underfunded: 1, overfunded: 0, moneyAvailable: 1, snoozed: 1 });
});

test('predicate của filter lọc đúng', () => {
  const f = PLAN_FILTERS.find((x) => x.id === 'overspent')!;
  expect(rows.filter(f.predicate).map((r) => r.categoryId)).toEqual(['a']);
});
