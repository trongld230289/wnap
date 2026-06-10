import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AccountSidebar } from './AccountSidebar';
import { BalanceHeader } from './BalanceHeader';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';
import { ReconcileModal } from './ReconcileModal';
import { TransferForm } from './TransferForm';
import { Button } from '@/components/ui/button';
import { useDialogs } from '../components/feedback/DialogProvider';
import { useI18n } from '../i18n/useI18n';
import type { LedgerTxn } from '../lib/mappers';

export function LedgerScreen() {
  const { loading, accounts, transactions, deleteTransaction } = useBudget();
  const { confirm } = useDialogs();
  const { t } = useI18n();
  const [selected, setSelected] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LedgerTxn | null>(null);
  const [modal, setModal] = useState<'reconcile' | 'transfer' | null>(null);

  if (loading) return <p className="m-10 text-sm text-muted-foreground">{t('ledger.loading')}</p>;

  const txns = selected === 'all' ? transactions : transactions.filter((t) => t.accountId === selected);
  const canAdd = selected !== 'all';

  function reset() { setAdding(false); setEditing(null); }
  async function onEdit(txn: LedgerTxn) {
    if (txn.status === 'reconciled' && !(await confirm({
      title: t('ledger.confirmEditTitle'),
      description: t('ledger.confirmEditDesc'),
      confirmText: t('ledger.confirmEditOk'),
    }))) return;
    setAdding(false); setEditing(txn);
  }
  async function onDelete(txn: LedgerTxn) {
    if (txn.status === 'reconciled' && !(await confirm({
      title: t('ledger.confirmEditTitle'),
      description: t('ledger.confirmDelDesc'),
      confirmText: t('ledger.confirmDelOk'),
      destructive: true,
    }))) return;
    if (!(await confirm({
      title: t('ledger.confirmDelTitle'),
      confirmText: t('ledger.delete'),
      destructive: true,
    }))) return;
    await deleteTransaction(txn.id);
  }

  return (
    <div className="mx-auto my-3 max-w-5xl px-3">
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card sm:flex-row">
        <AccountSidebar selected={selected} onSelect={(id) => { setSelected(id); reset(); }} />
        <div className="flex-1 p-4">
          <BalanceHeader accountId={selected} onReconcile={() => setModal('reconcile')} />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {canAdd ? (
              <>
                <Button size="sm" onClick={() => { setEditing(null); setAdding(true); }} disabled={adding}>{t('ledger.addTxn')}</Button>
                <Button size="sm" variant="outline" onClick={() => setModal('transfer')}>{t('ledger.transfer')}</Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {accounts.length === 0 ? t('ledger.pickAccountEmpty') : t('ledger.pickAccount')}
              </span>
            )}
          </div>
          {(adding || editing) && canAdd && <TransactionForm key={editing?.id ?? 'new'} accountId={selected} editing={editing} onDone={reset} />}
          <TransactionTable txns={txns} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      {modal === 'reconcile' && canAdd && <ReconcileModal accountId={selected} onClose={() => setModal(null)} />}
      {modal === 'transfer' && canAdd && <TransferForm fromId={selected} onClose={() => setModal(null)} />}
    </div>
  );
}
