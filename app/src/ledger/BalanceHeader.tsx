import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd } from '../budget/format';
import { Button } from '@/components/ui/button';

export function BalanceHeader({ accountId, onReconcile }: { accountId: string; onReconcile: () => void }) {
  const { accounts, transactions, accountName } = useBudget();
  const txns = accountId === 'all' ? transactions : transactions.filter((t) => t.accountId === accountId);
  const b = balances(txns);
  const title = accountId === 'all' ? 'Tất cả tài khoản' : accountName(accountId);
  const acc = accounts.find((a) => a.id === accountId);
  const recLabel = (() => {
    if (accountId === 'all' || !acc?.reconciledAt) return 'Chưa đối soát';
    const days = Math.floor((Date.now() - new Date(acc.reconciledAt).getTime()) / 86_400_000);
    return `Đối soát ${days} ngày trước`;
  })();

  const cell = (lab: string, v: number, color: string) => (
    <div className="flex-1 px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{lab}</div>
      <div className={`font-bold tabular-nums ${color}`}>{formatVnd(v)}₫</div>
    </div>
  );
  const op = (s: string) => <div className="self-center px-1 text-muted-foreground/60">{s}</div>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[15px] font-bold">{title}</span>
          <span className="text-[11px] text-muted-foreground">{recLabel}</span>
        </div>
        {accountId !== 'all' && <Button size="sm" variant="secondary" onClick={onReconcile}>⚖ Đối soát</Button>}
      </div>
      <div className="mb-2.5 flex rounded-lg border bg-card">
        {cell('Cleared', b.cleared, 'text-foreground')}{op('＋')}
        {cell('Uncleared', b.uncleared, 'text-status-amber')}{op('＝')}
        {cell('Working', b.working, 'text-status-green')}
      </div>
    </div>
  );
}
