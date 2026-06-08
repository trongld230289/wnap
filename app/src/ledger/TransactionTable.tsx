import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import type { LedgerTxn } from '../lib/mappers';

const STATUS_ICON: Record<string, string> = { uncleared: '○', cleared: 'C', reconciled: '🔒' };

export function TransactionTable({ txns }: { txns: LedgerTxn[] }) {
  const { categoryName, accountName, payees } = useBudget();
  const payeeName = (id: string | null) => (id ? payees.find((p) => p.id === id)?.name ?? '' : '');

  const th: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: '#999', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #eee' };
  const td: React.CSSProperties = { padding: '7px 8px', borderBottom: '1px solid #f3f3f3' };
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr><th style={th}></th><th style={th}>Ngày</th><th style={th}>Payee</th><th style={th}>Category</th><th style={th}>Memo</th><th style={{ ...th, textAlign: 'right' }}>Outflow</th><th style={{ ...th, textAlign: 'right' }}>Inflow</th></tr>
      </thead>
      <tbody>
        {txns.map((t) => (
          <tr key={t.id}>
            <td style={{ ...td, color: t.status === 'uncleared' ? '#bbb' : '#1f9d55' }}>{STATUS_ICON[t.status]}</td>
            <td style={td}>{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</td>
            <td style={td}>{t.transferId ? `⇄ ${accountName(t.accountId)}` : payeeName(t.payeeId)}</td>
            <td style={{ ...td, color: t.categoryId ? '#1f7d45' : '#999' }}>{t.categoryId ? categoryName(t.categoryId) : '(Transfer)'}</td>
            <td style={{ ...td, color: '#888' }}>{t.memo}</td>
            <td style={num}>{t.amount < 0 ? formatVnd(-t.amount) : ''}</td>
            <td style={{ ...num, color: '#1f9d55' }}>{t.amount > 0 ? formatVnd(t.amount) : ''}</td>
          </tr>
        ))}
        {txns.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#aaa', textAlign: 'center' }}>Chưa có giao dịch</td></tr>}
      </tbody>
    </table>
  );
}
