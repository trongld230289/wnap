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
