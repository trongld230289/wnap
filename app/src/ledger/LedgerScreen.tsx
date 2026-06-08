import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AccountSidebar } from './AccountSidebar';
import { BalanceHeader } from './BalanceHeader';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';

export function LedgerScreen() {
  const { loading, accounts, transactions } = useBudget();
  const [selected, setSelected] = useState<string>('all');
  const [adding, setAdding] = useState(false);

  if (loading) return <p style={{ fontFamily: 'sans-serif', margin: 40 }}>Đang tải sổ giao dịch…</p>;

  const txns = selected === 'all' ? transactions : transactions.filter((t) => t.accountId === selected);
  const canAdd = selected !== 'all';

  return (
    <div style={{ maxWidth: 980, margin: '12px auto', fontFamily: 'sans-serif', padding: '0 12px' }}>
      <div style={{ display: 'flex', border: '1px solid #e3e3e6', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        <AccountSidebar selected={selected} onSelect={(id) => { setSelected(id); setAdding(false); }} />
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <BalanceHeader accountId={selected} />
          <div style={{ marginBottom: 8 }}>
            {canAdd
              ? <button onClick={() => setAdding(true)} disabled={adding}>＋ Thêm giao dịch</button>
              : <span style={{ fontSize: 12, color: '#aaa' }}>Chọn 1 tài khoản để thêm giao dịch{accounts.length === 0 ? ' (tạo tài khoản trước)' : ''}</span>}
          </div>
          {adding && canAdd && <TransactionForm accountId={selected} onDone={() => setAdding(false)} />}
          <TransactionTable txns={txns} />
        </div>
      </div>
    </div>
  );
}
