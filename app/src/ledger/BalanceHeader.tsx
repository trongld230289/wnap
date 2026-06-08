import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd } from '../budget/format';

export function BalanceHeader({ accountId }: { accountId: string }) {
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
    <div style={{ flex: 1, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>{lab}</div>
      <div style={{ fontWeight: 700, color }}>{formatVnd(v)}₫</div>
    </div>
  );
  const op = (s: string) => <div style={{ alignSelf: 'center', color: '#bbb', padding: '0 4px' }}>{s}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div><span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{recLabel}</span></div>
      </div>
      <div style={{ display: 'flex', border: '1px solid #eee', borderRadius: 8, marginBottom: 10 }}>
        {cell('Cleared', b.cleared, '#333')}{op('＋')}{cell('Uncleared', b.uncleared, '#caa007')}{op('＝')}{cell('Working', b.working, '#1f9d55')}
      </div>
    </div>
  );
}
