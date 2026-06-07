import { expect, test } from 'vitest';
import { computeThrough } from '../compute';
import { buildPlanRows } from '../rows';
import {
  proposeAssignedLastMonth, proposeSpentLastMonth,
  proposeAverageAssigned, proposeAverageSpent,
  proposeResetAssigned, proposeResetAvailable,
} from '../autoAssign';
import type { BudgetInput } from '../types';

function makeInput(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
    ],
    transactions: [
      { id: 't1', accountId: 'a1', date: '2026-01-05', categoryId: 'rta', amount: 20_000_000, status: 'cleared' },
      { id: 't2', accountId: 'a1', date: '2026-01-15', categoryId: 'food', amount: -1_800_000, status: 'cleared' },
      { id: 't3', accountId: 'a1', date: '2026-02-12', categoryId: 'food', amount: -2_200_000, status: 'cleared' },
    ],
    assignments: [
      { categoryId: 'food', month: '2026-01', assigned: 2_000_000 },
      { categoryId: 'food', month: '2026-02', assigned: 3_000_000 },
    ],
    targets: [], snoozes: [], firstMonth: '2026-01',
  };
}

const setup = (month: string) => {
  const input = makeInput();
  const summaries = computeThrough(input, month);
  return { input, summaries, rows: buildPlanRows(input, summaries, month) };
};

test('assignedLastMonth copy đúng số tháng trước', () => {
  const { summaries, rows } = setup('2026-03');
  expect(proposeAssignedLastMonth(rows, summaries, '2026-03'))
    .toEqual([{ categoryId: 'food', newAssigned: 3_000_000 }]);
});

test('spentLastMonth = chi tiêu thực tháng trước', () => {
  const { summaries, rows } = setup('2026-03');
  expect(proposeSpentLastMonth(rows, summaries, '2026-03'))
    .toEqual([{ categoryId: 'food', newAssigned: 2_200_000 }]);
});

test('averageAssigned = trung bình 12 tháng gần nhất (làm tròn)', () => {
  const { input, summaries, rows } = setup('2026-03');
  // (2M + 3M) / 2 = 2.5M
  expect(proposeAverageAssigned(rows, summaries, '2026-03', input.firstMonth))
    .toEqual([{ categoryId: 'food', newAssigned: 2_500_000 }]);
});

test('averageSpent = trung bình chi tiêu', () => {
  const { input, summaries, rows } = setup('2026-03');
  // (1.8M + 2.2M) / 2 = 2M
  expect(proposeAverageSpent(rows, summaries, '2026-03', input.firstMonth))
    .toEqual([{ categoryId: 'food', newAssigned: 2_000_000 }]);
});

test('tháng đầu tiên không có lịch sử → đề xuất rỗng', () => {
  const { input, summaries, rows } = setup('2026-01');
  expect(proposeAssignedLastMonth(rows, summaries, '2026-01')).toEqual([]);
  expect(proposeAverageAssigned(rows, summaries, '2026-01', input.firstMonth)).toEqual([]);
});

test('resetAssigned đưa assigned về 0', () => {
  const { rows } = setup('2026-02');
  expect(proposeResetAssigned(rows)).toEqual([{ categoryId: 'food', newAssigned: 0 }]);
});

test('resetAvailable rút available dương về RTA', () => {
  const { rows } = setup('2026-02');
  // Feb: start 200k + assign 3M − 2.2M = available 1M → newAssigned = 3M − 1M = 2M
  expect(proposeResetAvailable(rows)).toEqual([{ categoryId: 'food', newAssigned: 2_000_000 }]);
});
