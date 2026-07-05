import type { LedgerTxn } from '../lib/mappers';

export interface MemoSuggestions {
  memosByPayee: Map<string, string[]>;
  allMemos: string[];
}

export function deriveMemoSuggestions(transactions: LedgerTxn[]): MemoSuggestions {
  const memosByPayee = new Map<string, string[]>();
  const perPayeeSeen = new Map<string, Set<string>>();
  const allMemos: string[] = [];
  const allSeen = new Set<string>();

  for (const t of transactions) {
    if (!t.memo) continue;
    const trimmed = t.memo.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();

    if (!allSeen.has(key)) {
      allSeen.add(key);
      allMemos.push(trimmed);
    }

    if (t.payeeId) {
      let seen = perPayeeSeen.get(t.payeeId);
      if (!seen) {
        seen = new Set();
        perPayeeSeen.set(t.payeeId, seen);
        memosByPayee.set(t.payeeId, []);
      }
      if (!seen.has(key)) {
        seen.add(key);
        memosByPayee.get(t.payeeId)!.push(trimmed);
      }
    }
  }

  return { memosByPayee, allMemos };
}
