import { expect, test } from 'vitest';
import { groupAccounts } from '../ledgerGroups';

const accounts = [
  { id: 'a1', name: 'Ví tiền mặt', type: 'cash' as const },
  { id: 'a2', name: 'Vietcombank', type: 'cash' as const },
  { id: 'a3', name: 'Sổ tiết kiệm', type: 'savings' as const },
];
const txns = [
  { accountId: 'a1', amount: 2_000_000 },
  { accountId: 'a2', amount: 5_000_000 },
  { accountId: 'a2', amount: 200_000 },
  { accountId: 'a3', amount: 50_000_000 },
];

test('nhóm cash/savings, working mỗi account = Σ amount, total = tổng', () => {
  const g = groupAccounts(accounts, txns);
  expect(g.cash.map((a) => [a.id, a.working])).toEqual([['a1', 2_000_000], ['a2', 5_200_000]]);
  expect(g.savings.map((a) => [a.id, a.working])).toEqual([['a3', 50_000_000]]);
  expect(g.total).toBe(57_200_000);
});

test('account chưa có giao dịch → working 0', () => {
  expect(groupAccounts([{ id: 'x', name: 'Mới', type: 'cash' }], []).cash[0].working).toBe(0);
});
