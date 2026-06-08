import { useBudget } from '../budget/useBudget';
import { groupAccounts } from './ledgerGroups';
import { formatVnd } from '../budget/format';

export function AccountSidebar({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { accounts, transactions, addAccount } = useBudget();
  const g = groupAccounts(accounts, transactions);

  async function onAdd() {
    const name = window.prompt('Tên tài khoản mới:');
    if (!name) return;
    const type = window.confirm('OK = Tiết kiệm (Savings), Cancel = Tiền mặt (Cash)') ? 'savings' : 'cash';
    await addAccount(name, type);
  }

  const item = (id: string, name: string, working: number) => (
    <div key={id} onClick={() => onSelect(id)}
      style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
        background: selected === id ? '#e8f3ec' : 'transparent', color: selected === id ? '#1f7d45' : '#333', fontWeight: selected === id ? 600 : 400 }}>
      <span>{name}</span><span style={{ color: '#999' }}>{formatVnd(working)}</span>
    </div>
  );
  const grpLabel = (s: string) => <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', margin: '10px 0 4px' }}>{s}</div>;

  return (
    <div style={{ width: 190, background: '#fafafa', borderRight: '1px solid #eee', padding: 10, fontSize: 13 }}>
      {item('all', 'Tất cả tài khoản', g.total)}
      {g.cash.length > 0 && grpLabel('Tiền mặt')}
      {g.cash.map((a) => item(a.id, a.name, a.working))}
      {g.savings.length > 0 && grpLabel('Tiết kiệm')}
      {g.savings.map((a) => item(a.id, a.name, a.working))}
      <div onClick={onAdd} style={{ marginTop: 12, color: '#2b6cb0', cursor: 'pointer' }}>＋ Thêm tài khoản</div>
    </div>
  );
}
