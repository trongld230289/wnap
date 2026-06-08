export type TxStatus = 'uncleared' | 'cleared' | 'reconciled';
export interface BalTxn { amount: number; status: TxStatus; }
export interface Balances { cleared: number; uncleared: number; working: number; }

/** Cleared = Σ amount của tx đã cleared/reconciled; Uncleared = Σ tx uncleared; Working = tổng. */
export function balances(txns: BalTxn[]): Balances {
  let cleared = 0;
  let uncleared = 0;
  for (const t of txns) {
    if (t.status === 'uncleared') uncleared += t.amount;
    else cleared += t.amount;
  }
  return { cleared, uncleared, working: cleared + uncleared };
}
