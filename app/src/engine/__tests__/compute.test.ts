import { expect, test } from 'vitest';
import { computeThrough } from '../compute';
import type { BudgetInput, Transaction } from '../types';

const CATS = [
  { id: 'rta', groupId: 'g0', name: 'Inflow: Ready to Assign', kind: 'other', isSystem: true },
  { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
  { id: 'rent', groupId: 'g1', name: 'Tiền nhà', kind: 'bill', isSystem: false },
] as const;

let n = 0;
function tx(p: Partial<Transaction> & { amount: number }): Transaction {
  return { id: `t${++n}`, accountId: 'a1', date: '2026-01-10', categoryId: null, status: 'cleared', ...p };
}

function input(p: Partial<BudgetInput> = {}): BudgetInput {
  return {
    categories: [...CATS], transactions: [], assignments: [],
    targets: [], snoozes: [], firstMonth: '2026-01', ...p,
  };
}

test('inflow vào system category làm tăng RTA', () => {
  const out = computeThrough(
    input({ transactions: [tx({ categoryId: 'rta', amount: 10_000_000 })] }),
    '2026-01',
  );
  expect(out.get('2026-01')!.rta).toBe(10_000_000);
});

test('assign chuyển tiền RTA → category', () => {
  const out = computeThrough(
    input({
      transactions: [tx({ categoryId: 'rta', amount: 10_000_000 })],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 3_000_000 }],
    }),
    '2026-01',
  );
  const jan = out.get('2026-01')!;
  expect(jan.rta).toBe(7_000_000);
  expect(jan.categories.get('food')!.available).toBe(3_000_000);
});

test('chi tiêu giảm available, không ảnh hưởng RTA', () => {
  const out = computeThrough(
    input({
      transactions: [
        tx({ categoryId: 'rta', amount: 10_000_000 }),
        tx({ categoryId: 'food', amount: -1_200_000 }),
      ],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 3_000_000 }],
    }),
    '2026-01',
  );
  const jan = out.get('2026-01')!;
  expect(jan.categories.get('food')!.activity).toBe(-1_200_000);
  expect(jan.categories.get('food')!.available).toBe(1_800_000);
  expect(jan.rta).toBe(7_000_000);
});

test('transaction không category (chưa categorize) bị bỏ qua trong budget math', () => {
  const out = computeThrough(
    input({ transactions: [tx({ categoryId: null, amount: -500_000 })] }),
    '2026-01',
  );
  expect(out.get('2026-01')!.rta).toBe(0);
});
