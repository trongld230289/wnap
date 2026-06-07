import { expect, test } from 'vitest';
import { computeThrough } from '../compute';
import type { BudgetInput, Transaction } from '../types';

const CATS = [
  { id: 'rta', groupId: 'g0', name: 'Inflow: Ready to Assign', kind: 'other', isSystem: true },
  { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
  { id: 'rent', groupId: 'g1', name: 'Tiền nhà', kind: 'bill', isSystem: false },
] as const;

function tx(p: Partial<Transaction> & { amount: number }): Transaction {
  return { id: crypto.randomUUID(), accountId: 'a1', date: '2026-01-10', categoryId: null, status: 'cleared', ...p };
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

test('available dương carry sang tháng sau', () => {
  const out = computeThrough(
    input({
      transactions: [tx({ categoryId: 'rta', amount: 5_000_000 })],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 2_000_000 }],
    }),
    '2026-02',
  );
  const feb = out.get('2026-02')!.categories.get('food')!;
  expect(feb.startBalance).toBe(2_000_000);
  expect(feb.available).toBe(2_000_000);
  expect(out.get('2026-02')!.rta).toBe(3_000_000); // RTA cũng carry
});

test('available âm reset về 0 và trừ vào RTA tháng sau (chuẩn YNAB)', () => {
  const out = computeThrough(
    input({
      transactions: [
        tx({ categoryId: 'rta', amount: 10_000_000 }),
        tx({ categoryId: 'food', amount: -1_500_000 }), // chi 1.5M, chỉ assign 1M
      ],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 1_000_000 }],
    }),
    '2026-02',
  );
  const jan = out.get('2026-01')!;
  expect(jan.categories.get('food')!.available).toBe(-500_000);
  expect(jan.rta).toBe(9_000_000);

  const feb = out.get('2026-02')!;
  expect(feb.categories.get('food')!.available).toBe(0);     // reset
  expect(feb.rta).toBe(8_500_000);                            // 9M − 500k overspent
});

test('chuỗi 3 tháng: rollover cộng dồn đúng', () => {
  const out = computeThrough(
    input({
      transactions: [
        tx({ categoryId: 'rta', amount: 10_000_000, date: '2026-01-05' }),
        tx({ categoryId: 'rta', amount: 10_000_000, date: '2026-02-05' }),
        tx({ categoryId: 'food', amount: -800_000, date: '2026-02-10' }),
      ],
      assignments: [
        { categoryId: 'food', month: '2026-01', assigned: 1_000_000 },
        { categoryId: 'food', month: '2026-02', assigned: 1_000_000 },
      ],
    }),
    '2026-03',
  );
  // Feb: start 1M + assign 1M − 800k = 1.2M
  expect(out.get('2026-02')!.categories.get('food')!.available).toBe(1_200_000);
  // Mar: carry 1.2M
  expect(out.get('2026-03')!.categories.get('food')!.available).toBe(1_200_000);
  // RTA Mar = 10M + 10M − 2M assigned = 18M
  expect(out.get('2026-03')!.rta).toBe(18_000_000);
});
