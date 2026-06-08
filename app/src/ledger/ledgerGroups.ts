export type AccountType = 'cash' | 'savings';
export interface AccountLite { id: string; name: string; type: AccountType; }
export interface AccTxnLite { accountId: string; amount: number; }
export interface AccountWithBalance extends AccountLite { working: number; }
export interface AccountGroups { cash: AccountWithBalance[]; savings: AccountWithBalance[]; total: number; }

/** Working mỗi account = Σ amount mọi giao dịch của nó (cleared + uncleared). */
export function groupAccounts(accounts: AccountLite[], txns: AccTxnLite[]): AccountGroups {
  const workingById = new Map<string, number>();
  for (const t of txns) workingById.set(t.accountId, (workingById.get(t.accountId) ?? 0) + t.amount);
  const withBal: AccountWithBalance[] = accounts.map((a) => ({ ...a, working: workingById.get(a.id) ?? 0 }));
  return {
    cash: withBal.filter((a) => a.type === 'cash'),
    savings: withBal.filter((a) => a.type === 'savings'),
    total: withBal.reduce((s, a) => s + a.working, 0),
  };
}
