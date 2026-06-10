import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import { cn } from '@/lib/utils';
import { useDialogs } from '../components/feedback/DialogProvider';
import { useI18n } from '../i18n/useI18n';
import type { LedgerTxn } from '../lib/mappers';

const STATUS_ICON: Record<string, string> = { uncleared: '○', cleared: 'C', reconciled: '🔒' };

export function TransactionTable({ txns, onEdit, onDelete }: { txns: LedgerTxn[]; onEdit: (t: LedgerTxn) => void; onDelete: (t: LedgerTxn) => void }) {
  const { categoryName, accountName, payees, setTxStatus } = useBudget();
  const { notify } = useDialogs();
  const { t } = useI18n();
  const payeeName = (id: string | null) => (id ? payees.find((p) => p.id === id)?.name ?? '' : '');

  function toggle(txn: LedgerTxn) {
    if (txn.status === 'reconciled') { void notify({ title: t('txn.lockedTitle'), description: t('txn.lockedDesc') }); return; }
    setTxStatus(txn.id, txn.status === 'uncleared' ? 'cleared' : 'uncleared');
  }

  const th = 'px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground';
  const td = 'px-2 py-2 align-middle';

  if (txns.length === 0) {
    return <div className="rounded-xl border bg-card px-2 py-6 text-center text-sm text-muted-foreground">{t('txn.empty')}</div>;
  }

  return (
    <>
      {/* Mobile: card list (<sm) */}
      <ul className="space-y-2 sm:hidden">
        {txns.map((tx) => (
          <TransactionCard
            key={tx.id} txn={tx}
            label={tx.transferId ? `⇄ ${accountName(tx.accountId)}` : payeeName(tx.payeeId)}
            category={tx.categoryId ? categoryName(tx.categoryId) : t('txn.transfer')}
            onToggle={() => toggle(tx)} onEdit={() => onEdit(tx)} onDelete={() => onDelete(tx)}
          />
        ))}
      </ul>

      {/* Desktop: table (≥sm) */}
      <div className="hidden overflow-hidden rounded-xl border bg-card sm:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b">
              <th className={th}></th>
              <th className={th}>{t('txn.colDate')}</th>
              <th className={th}>{t('txn.colPayee')}</th>
              <th className={th}>{t('txn.colCategory')}</th>
              <th className={th}>{t('txn.colMemo')}</th>
              <th className={cn(th, 'text-right')}>{t('txn.colOutflow')}</th>
              <th className={cn(th, 'text-right')}>{t('txn.colInflow')}</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {txns.map((tx) => (
              <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/40">
                <td
                  className={cn(td, 'cursor-pointer text-center', tx.status === 'uncleared' ? 'text-muted-foreground/50' : 'text-status-green')}
                  onClick={() => toggle(tx)}
                  title={t('txn.toggleTip')}
                >
                  {STATUS_ICON[tx.status]}
                </td>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}</td>
                <td className={td}>{tx.transferId ? `⇄ ${accountName(tx.accountId)}` : payeeName(tx.payeeId)}</td>
                <td className={cn(td, tx.categoryId ? 'text-accent-foreground' : 'text-muted-foreground')}>{tx.categoryId ? categoryName(tx.categoryId) : t('txn.transfer')}</td>
                <td className={cn(td, 'text-muted-foreground')}>{tx.memo}</td>
                <td className={cn(td, 'text-right tabular-nums')}>{tx.amount < 0 ? formatVnd(-tx.amount) : ''}</td>
                <td className={cn(td, 'text-right tabular-nums text-status-green')}>{tx.amount > 0 ? formatVnd(tx.amount) : ''}</td>
                <td className={cn(td, 'whitespace-nowrap text-right')}>
                  {!tx.transferId && (
                    <button onClick={() => onEdit(tx)} title={t('txn.editTip')} className="px-1 opacity-70 transition-opacity hover:opacity-100">✏️</button>
                  )}
                  <button onClick={() => onDelete(tx)} title={t('txn.deleteTip')} className="px-1 opacity-70 transition-opacity hover:opacity-100">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TransactionCard({ txn, label, category, onToggle, onEdit, onDelete }: {
  txn: LedgerTxn; label: string; category: string;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <li className="rounded-xl border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{label || '—'}</span>
        <span className={cn('shrink-0 tabular-nums font-semibold', txn.amount > 0 ? 'text-status-green' : 'text-foreground')}>
          {txn.amount > 0 ? '+' : '-'}{formatVnd(Math.abs(txn.amount))}₫
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{txn.date.slice(8, 10)}/{txn.date.slice(5, 7)}</span>
          <span>·</span>
          <span className={txn.categoryId ? 'text-accent-foreground' : ''}>{category}</span>
          <button
            onClick={onToggle}
            aria-label={t('txn.toggleTip')}
            className={cn('rounded p-2 -m-1 leading-none', txn.status === 'uncleared' ? 'text-muted-foreground/50' : 'text-status-green')}
            title={t('txn.toggleTip')}
          >
            {STATUS_ICON[txn.status]}
          </button>
        </span>
        <span className="shrink-0 whitespace-nowrap">
          {!txn.transferId && <button onClick={onEdit} aria-label={t('txn.editTip')} title={t('txn.editTip')} className="px-1 opacity-70 hover:opacity-100">✏️</button>}
          <button onClick={onDelete} aria-label={t('txn.deleteTip')} title={t('txn.deleteTip')} className="px-1 opacity-70 hover:opacity-100">🗑️</button>
        </span>
      </div>
    </li>
  );
}
