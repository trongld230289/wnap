import { expect, test } from 'vitest';
import { computeThrough, buildPlanRows } from '../../engine';
import type { BudgetInput } from '../../engine';
import { AUTO_KINDS, computeProposals } from '../autoAssign';

function input(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
    ],
    transactions: [
      { id: 't1', accountId: 'a1', date: '2026-01-05', categoryId: 'rta', amount: 20_000_000, status: 'cleared' },
      { id: 't2', accountId: 'a1', date: '2026-01-15', categoryId: 'food', amount: -1_800_000, status: 'cleared' },
    ],
    assignments: [{ categoryId: 'food', month: '2026-01', assigned: 2_000_000 }],
    targets: [], snoozes: [], firstMonth: '2026-01',
  };
}

function ctxAt(month: string) {
  const i = input();
  const summaries = computeThrough(i, month);
  const rows = buildPlanRows(i, summaries, month);
  return { rows, rta: summaries.get(month)!.rta, summaries, month, firstMonth: '2026-01' };
}

test('AUTO_KINDS có 7 nút đúng thứ tự', () => {
  expect(AUTO_KINDS.map((k) => k.id)).toEqual([
    'underfunded', 'assignedLastMonth', 'spentLastMonth',
    'averageAssigned', 'averageSpent', 'resetAvailable', 'resetAssigned',
  ]);
});

test('route assignedLastMonth → copy assigned tháng trước', () => {
  expect(computeProposals('assignedLastMonth', ctxAt('2026-02')))
    .toEqual([{ categoryId: 'food', newAssigned: 2_000_000 }]);
});

test('route spentLastMonth → chi tiêu tháng trước', () => {
  expect(computeProposals('spentLastMonth', ctxAt('2026-02')))
    .toEqual([{ categoryId: 'food', newAssigned: 1_800_000 }]);
});

test('route resetAssigned → assigned đang có về 0', () => {
  expect(computeProposals('resetAssigned', ctxAt('2026-01')))
    .toEqual([{ categoryId: 'food', newAssigned: 0 }]);
});
