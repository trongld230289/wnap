import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AccountSidebar } from './AccountSidebar';
import { BalanceHeader } from './BalanceHeader';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';
import { ReconcileModal } from './ReconcileModal';
import { TransferForm } from './TransferForm';
import type { LedgerTxn } from '../lib/mappers';

export function LedgerScreen() {
  const { loading, accounts, transactions, deleteTransaction } = useBudget();
  const [selected, setSelected] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LedgerTxn | null>(null);
  const [modal, setModal] = useState<'reconcile' | 'transfer' | null>(null);

  if (loading) return <p style={{ fontFamily: 'sans-serif', margin: 40 }}>Đang tải sổ giao dịch…</p>;

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
    <div style={{ maxWidth: 980, margin: '12px auto', fontFamily: 'sans-serif', padding: '0 12px' }}>
      <div style={{ display: 'flex', border: '1px solid #e3e3e6', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        <AccountSidebar selected={selected} onSelect={(id) => { setSelected(id); reset(); }} />
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <BalanceHeader accountId={selected} onReconcile={() => setModal('reconcile')} />
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            {canAdd ? (
              <>
                <button onClick={() => { setEditing(null); setAdding(true); }} disabled={adding}>＋ Thêm giao dịch</button>
                <button onClick={() => setModal('transfer')}>⇄ Chuyển khoản</button>
              </>
            ) : <span style={{ fontSize: 12, color: '#aaa' }}>Chọn 1 tài khoản để thêm giao dịch{accounts.length === 0 ? ' (tạo tài khoản trước)' : ''}</span>}
          </div>
          {(adding || editing) && canAdd && <TransactionForm accountId={selected} editing={editing} onDone={reset} />}
          <TransactionTable txns={txns} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      {modal === 'reconcile' && canAdd && <ReconcileModal accountId={selected} onClose={() => setModal(null)} />}
      {modal === 'transfer' && canAdd && <TransferForm fromId={selected} onClose={() => setModal(null)} />}
    </div>
  );
}
