import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd } from '../budget/format';
import { useI18n } from '../i18n/useI18n';
import { Button } from '@/components/ui/button';

export function BalanceHeader({ accountId, onReconcile }: { accountId: string; onReconcile: () => void }) {
  const { accounts, transactions, accountName } = useBudget();
  const { t } = useI18n();
  const txns = accountId === 'all' ? transactions : transactions.filter((tx) => tx.accountId === accountId);
  const b = balances(txns);
  const title = accountId === 'all' ? t('acct.all') : accountName(accountId);
  const acc = accounts.find((a) => a.id === accountId);
  const recLabel = (() => {
    if (accountId === 'all' || !acc?.reconciledAt) return t('balance.notReconciled');
    const days = Math.floor((Date.now() - new Date(acc.reconciledAt).getTime()) / 86_400_000);
    return t('balance.reconciledAgo', { days });
  })();

  const cell = (lab: string, v: number, color: string) => (
    <div className="flex-1 px-1 py-2 text-center sm:px-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{lab}</div>
      <div className={`text-xs font-bold tabular-nums sm:text-base ${color}`}>{formatVnd(v)}₫</div>
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
        {accountId !== 'all' && <Button size="sm" variant="secondary" onClick={onReconcile}>{t('balance.reconcile')}</Button>}
      </div>
      <div className="mb-2.5 flex rounded-lg border bg-card">
        {cell(t('balance.cleared'), b.cleared, 'text-foreground')}{op('＋')}
        {cell(t('balance.uncleared'), b.uncleared, 'text-status-amber')}{op('＝')}
        {cell(t('balance.working'), b.working, 'text-status-green')}
      </div>
    </div>
  );
}
