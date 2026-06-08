import { expect, test } from 'vitest';
import { toBudgetInput, deriveFirstMonth } from '../../lib/mappers';
import type { RawBudgetData } from '../../lib/mappers';

const raw: RawBudgetData = {
  categories: [
    { id: 'c-rta', group_id: 'g-sys', name: 'Inflow: Ready to Assign', kind: 'other', is_system: true },
    { id: 'c-food', group_id: 'g1', name: 'Ăn uống', kind: 'need', is_system: false },
  ],
  targets: [
    { category_id: 'c-food', strategy: 'refill', amount: 600000, cadence: 'monthly',
      due_day: null, due_weekday: null, due_date: null },
  ],
  snoozes: [{ category_id: 'c-food', month: '2026-06' }],
  assignments: [{ category_id: 'c-food', month: '2026-05', assigned: 500000 }],
  transactions: [
    { id: 't1', account_id: 'a1', date: '2026-05-10', category_id: 'c-food', amount: -150000, status: 'cleared' },
    { id: 't2', account_id: 'a1', date: '2026-06-01', category_id: 'c-rta', amount: 1320000, status: 'cleared' },
  ],
};

test('toBudgetInput chuyển snake_case → kiểu engine', () => {
  const input = toBudgetInput(raw, '2026-05');
  expect(input.categories[1]).toEqual({ id: 'c-food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false });
  expect(input.targets[0]).toEqual({ categoryId: 'c-food', strategy: 'refill', amount: 600000, cadence: 'monthly', dueDay: null, dueWeekday: null, dueDate: null });
  expect(input.snoozes[0]).toEqual({ categoryId: 'c-food', month: '2026-06' });
  expect(input.assignments[0]).toEqual({ categoryId: 'c-food', month: '2026-05', assigned: 500000 });
  expect(input.transactions[0]).toEqual({ id: 't1', accountId: 'a1', date: '2026-05-10', categoryId: 'c-food', amount: -150000, status: 'cleared' });
  expect(input.firstMonth).toBe('2026-05');
});

test('deriveFirstMonth = tháng nhỏ nhất giữa transactions & assignments', () => {
  expect(deriveFirstMonth(raw)).toBe('2026-05'); // tx 2026-05 sớm hơn assignment 2026-05
});

test('deriveFirstMonth rỗng → fallback tháng truyền vào', () => {
  expect(deriveFirstMonth({ categories: [], targets: [], snoozes: [], assignments: [], transactions: [] }, '2026-09')).toBe('2026-09');
});

import { mapAccounts, mapPayees, mapLedgerTxns } from '../../lib/mappers';

test('mapAccounts: snake → camel, giữ reconciled_at', () => {
  expect(mapAccounts([{ id: 'a1', name: 'VCB', type: 'cash', reconciled_at: '2026-06-01T00:00:00Z', sort_order: 0 }]))
    .toEqual([{ id: 'a1', name: 'VCB', type: 'cash', reconciledAt: '2026-06-01T00:00:00Z' }]);
});

test('mapPayees', () => {
  expect(mapPayees([{ id: 'p1', name: 'Co.opmart' }])).toEqual([{ id: 'p1', name: 'Co.opmart' }]);
});

test('mapLedgerTxns: gồm payee/memo/transfer, default null', () => {
  expect(mapLedgerTxns([
    { id: 't1', account_id: 'a1', date: '2026-06-05', category_id: 'c1', amount: -200000, status: 'uncleared', payee_id: 'p1', memo: 'chợ', transfer_id: null },
    { id: 't2', account_id: 'a1', date: '2026-06-06', category_id: null, amount: 100, status: 'cleared' },
  ])).toEqual([
    { id: 't1', accountId: 'a1', date: '2026-06-05', payeeId: 'p1', categoryId: 'c1', memo: 'chợ', amount: -200000, status: 'uncleared', transferId: null },
    { id: 't2', accountId: 'a1', date: '2026-06-06', payeeId: null, categoryId: null, memo: null, amount: 100, status: 'cleared', transferId: null },
  ]);
});
