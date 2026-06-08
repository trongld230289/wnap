import { expect, test } from 'vitest';
import { barFill } from '../barFill';
import type { PlanRow } from '../../engine';

function row(p: Partial<PlanRow> & { categoryId: string }): PlanRow {
  return { kind: 'need', startBalance: 0, assigned: 0, activity: 0, available: 0, target: null, needed: 0, snoozed: false, ...p };
}
const setAside = (amount: number) => ({ categoryId: 'c', strategy: 'set_aside' as const, amount, cadence: 'monthly' as const });

test('overspent: đầy + đỏ', () => {
  expect(barFill(row({ categoryId: 'c', available: -50 }))).toEqual({ pct: 1, color: 'red' });
});

test('có target: pct = available/amount kẹp 0..1, màu theo status', () => {
  expect(barFill(row({ categoryId: 'c', target: setAside(400), needed: 400, assigned: 400, available: 400 }))).toEqual({ pct: 1, color: 'green' });
  expect(barFill(row({ categoryId: 'c', target: setAside(400), needed: 400, assigned: 100, available: 100 }))).toEqual({ pct: 0.25, color: 'yellow' });
});

test('không target, có tiền: đầy + xanh', () => {
  expect(barFill(row({ categoryId: 'c', available: 20 }))).toEqual({ pct: 1, color: 'green' });
});

test('không target, rỗng: trống + xám', () => {
  expect(barFill(row({ categoryId: 'c', available: 0 }))).toEqual({ pct: 0, color: 'gray' });
});

test('snoozed có target: trống + xám', () => {
  expect(barFill(row({ categoryId: 'c', target: setAside(400), snoozed: true, available: 0 }))).toEqual({ pct: 0, color: 'gray' });
});
