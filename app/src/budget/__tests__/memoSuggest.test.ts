import { expect, test } from 'vitest';
import { deriveMemoSuggestions } from '../memoSuggest';
import type { LedgerTxn } from '../../lib/mappers';

const tx = (over: Partial<LedgerTxn>): LedgerTxn => ({
  id: 'x', accountId: 'a1', date: '2026-07-01', payeeId: null, categoryId: null,
  memo: null, amount: -1000, status: 'uncleared', transferId: null, ...over,
});

test('groups memos by payee, most-recent first', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '3', date: '2026-07-03', payeeId: 'p1', memo: 'cà phê chiều' }),
    tx({ id: '2', date: '2026-07-02', payeeId: 'p2', memo: 'ăn tối' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'cà phê sáng' }),
  ];
  const { memosByPayee } = deriveMemoSuggestions(txns);
  expect(memosByPayee.get('p1')).toEqual(['cà phê chiều', 'cà phê sáng']);
  expect(memosByPayee.get('p2')).toEqual(['ăn tối']);
});

test('allMemos: distinct across all txns, most-recent first', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '3', date: '2026-07-03', payeeId: 'p1', memo: 'cà phê' }),
    tx({ id: '2', date: '2026-07-02', payeeId: 'p2', memo: 'ăn tối' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'cà phê' }),
  ];
  const { allMemos } = deriveMemoSuggestions(txns);
  expect(allMemos).toEqual(['cà phê', 'ăn tối']);
});

test('case-insensitive dedup keeps the most recent casing', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '2', date: '2026-07-02', payeeId: 'p1', memo: 'Cà Phê' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'cà phê' }),
  ];
  const { memosByPayee, allMemos } = deriveMemoSuggestions(txns);
  expect(memosByPayee.get('p1')).toEqual(['Cà Phê']);
  expect(allMemos).toEqual(['Cà Phê']);
});

test('skips null, empty, and whitespace-only memos', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '4', payeeId: 'p1', memo: null }),
    tx({ id: '3', payeeId: 'p1', memo: '' }),
    tx({ id: '2', payeeId: 'p1', memo: '   ' }),
    tx({ id: '1', payeeId: 'p1', memo: 'thật' }),
  ];
  const { memosByPayee, allMemos } = deriveMemoSuggestions(txns);
  expect(memosByPayee.get('p1')).toEqual(['thật']);
  expect(allMemos).toEqual(['thật']);
});

test('null payeeId: excluded from memosByPayee, included in allMemos', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '2', date: '2026-07-02', payeeId: null, memo: 'ẩn danh' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'có payee' }),
  ];
  const { memosByPayee, allMemos } = deriveMemoSuggestions(txns);
  expect(memosByPayee.has('')).toBe(false);
  expect(memosByPayee.get('p1')).toEqual(['có payee']);
  expect(allMemos).toEqual(['ẩn danh', 'có payee']);
});

test('empty input → empty map and array', () => {
  const { memosByPayee, allMemos } = deriveMemoSuggestions([]);
  expect(memosByPayee.size).toBe(0);
  expect(allMemos).toEqual([]);
});
