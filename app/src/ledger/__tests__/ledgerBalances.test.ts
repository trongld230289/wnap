import { expect, test } from 'vitest';
import { balances } from '../ledgerBalances';

test('cleared gồm cả reconciled; uncleared riêng; working = tổng', () => {
  const out = balances([
    { amount: 5_000_000, status: 'reconciled' },
    { amount: -400_000, status: 'cleared' },
    { amount: 200_000, status: 'uncleared' },
    { amount: -50_000, status: 'uncleared' },
  ]);
  expect(out.cleared).toBe(4_600_000);     // 5.0tr − 400k
  expect(out.uncleared).toBe(150_000);     // 200k − 50k
  expect(out.working).toBe(4_750_000);     // cleared + uncleared
});

test('rỗng → tất cả 0', () => {
  expect(balances([])).toEqual({ cleared: 0, uncleared: 0, working: 0 });
});
