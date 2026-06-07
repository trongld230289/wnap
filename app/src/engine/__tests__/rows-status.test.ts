import { expect, test } from 'vitest';
import { computeThrough } from '../compute';
import { buildPlanRows } from '../rows';
import { categoryStatus } from '../status';
import type { BudgetInput, PlanRow } from '../types';

function base(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
    ],
    transactions: [
      { id: 't1', accountId: 'a1', date: '2026-01-05', categoryId: 'rta', amount: 5_000_000, status: 'cleared' },
    ],
    assignments: [], targets: [], snoozes: [], firstMonth: '2026-01',
  };
}

function rowsFor(input: BudgetInput, month: string): PlanRow[] {
  return buildPlanRows(input, computeThrough(input, month), month);
}

test('buildPlanRows ráp đủ assigned/activity/available/needed', () => {
  const input = base();
  input.assignments.push({ categoryId: 'food', month: '2026-01', assigned: 2_000_000 });
  input.targets.push({ categoryId: 'food', strategy: 'refill', amount: 3_000_000, cadence: 'monthly' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(row.assigned).toBe(2_000_000);
  expect(row.available).toBe(2_000_000);
  expect(row.needed).toBe(3_000_000); // startBalance 0 → cần đủ cap
});

test('red khi available âm (ưu tiên cao nhất)', () => {
  const input = base();
  input.transactions.push({ id: 't2', accountId: 'a1', date: '2026-01-10', categoryId: 'food', amount: -700_000, status: 'cleared' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('red');
});

test('yellow khi có target chưa đạt', () => {
  const input = base();
  input.targets.push({ categoryId: 'food', strategy: 'set_aside', amount: 1_000_000, cadence: 'monthly' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('yellow');
});

test('green khi target đạt đủ', () => {
  const input = base();
  input.targets.push({ categoryId: 'food', strategy: 'set_aside', amount: 1_000_000, cadence: 'monthly' });
  input.assignments.push({ categoryId: 'food', month: '2026-01', assigned: 1_000_000 });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('green');
});

test('green khi không target nhưng có tiền', () => {
  const input = base();
  input.assignments.push({ categoryId: 'food', month: '2026-01', assigned: 500_000 });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('green');
});

test('gray-snoozed khi target bị snooze tháng này', () => {
  const input = base();
  input.targets.push({ categoryId: 'food', strategy: 'set_aside', amount: 1_000_000, cadence: 'monthly' });
  input.snoozes.push({ categoryId: 'food', month: '2026-01' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(row.needed).toBe(0);
  expect(categoryStatus(row)).toBe('gray-snoozed');
});

test('gray khi zero và không target', () => {
  const [row] = rowsFor(base(), '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('gray');
});
