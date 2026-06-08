import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AccountSidebar } from './AccountSidebar';
import { BalanceHeader } from './BalanceHeader';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';
import { ReconcileModal } from './ReconcileModal';
import { TransferForm } from './TransferForm';
import { Button } from '@/components/ui/button';
import type { LedgerTxn } from '../lib/mappers';

export function LedgerScreen() {
  const { loading, accounts, transactions, deleteTransaction } = useBudget();
  const [selected, setSelected] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LedgerTxn | null>(null);
  const [modal, setModal] = useState<'reconcile' | 'transfer' | null>(null);

  if (loading) return <p className="m-10 text-sm text-muted-foreground">Đang tải sổ giao dịch…</p>;

  const txns = selected === 'all' ? transactions : transactions.filter((t) => t.accountId === selected);
  const canAdd = selected !== 'all';

  function reset() { setAdding(false); setEditing(null); }
  function onEdit(t: LedgerTxn) {
    if (t.status === 'reconciled' && !window.confirm('Giao dịch đã đối soát, sửa có thể làm lệch số dư ngân hàng. Tiếp tục?')) return;
    setAdding(false); setEditing(t);
  }
  async function onDelete(t: LedgerTxn) {
    if (t.status === 'reconciled' && !window.confirm('Giao dịch đã đối soát, xóa có thể làm lệch số dư. Tiếp tục?')) return;
    if (!window.confirm('Xóa giao dịch này?')) return;
    await deleteTransaction(t.id);
  }

  return (
    <div className="mx-auto my-3 max-w-5xl px-3">
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card md:flex-row">
        <AccountSidebar selected={selected} onSelect={(id) => { setSelected(id); reset(); }} />
        <div className="flex-1 p-4">
          <BalanceHeader accountId={selected} onReconcile={() => setModal('reconcile')} />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {canAdd ? (
              <>
                <Button size="sm" onClick={() => { setEditing(null); setAdding(true); }} disabled={adding}>＋ Thêm giao dịch</Button>
                <Button size="sm" variant="outline" onClick={() => setModal('transfer')}>⇄ Chuyển khoản</Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Chọn 1 tài khoản để thêm giao dịch{accounts.length === 0 ? ' (tạo tài khoản trước)' : ''}
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
