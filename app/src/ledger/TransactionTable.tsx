import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import { cn } from '@/lib/utils';
import type { LedgerTxn } from '../lib/mappers';

const STATUS_ICON: Record<string, string> = { uncleared: '○', cleared: 'C', reconciled: '🔒' };

export function TransactionTable({ txns, onEdit, onDelete }: { txns: LedgerTxn[]; onEdit: (t: LedgerTxn) => void; onDelete: (t: LedgerTxn) => void }) {
  const { categoryName, accountName, payees, setTxStatus } = useBudget();
  const payeeName = (id: string | null) => (id ? payees.find((p) => p.id === id)?.name ?? '' : '');

  function toggle(t: LedgerTxn) {
    if (t.status === 'reconciled') { window.alert('Giao dịch đã đối soát (đã khóa).'); return; }
    setTxStatus(t.id, t.status === 'uncleared' ? 'cleared' : 'uncleared');
  }

  const th = 'px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground';
  const td = 'px-2 py-2 align-middle';

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b">
            <th className={th}></th>
            <th className={th}>Ngày</th>
            <th className={th}>Payee</th>
            <th className={th}>Category</th>
            <th className={th}>Memo</th>
            <th className={cn(th, 'text-right')}>Outflow</th>
            <th className={cn(th, 'text-right')}>Inflow</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {txns.map((t) => (
            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
              <td
                className={cn(td, 'cursor-pointer text-center', t.status === 'uncleared' ? 'text-muted-foreground/50' : 'text-status-green')}
                onClick={() => toggle(t)}
                title="Đổi trạng thái"
              >
                {STATUS_ICON[t.status]}
              </td>
              <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</td>
              <td className={td}>{t.transferId ? `⇄ ${accountName(t.accountId)}` : payeeName(t.payeeId)}</td>
              <td className={cn(td, t.categoryId ? 'text-accent-foreground' : 'text-muted-foreground')}>{t.categoryId ? categoryName(t.categoryId) : '(Transfer)'}</td>
              <td className={cn(td, 'text-muted-foreground')}>{t.memo}</td>
              <td className={cn(td, 'text-right tabular-nums')}>{t.amount < 0 ? formatVnd(-t.amount) : ''}</td>
              <td className={cn(td, 'text-right tabular-nums text-status-green')}>{t.amount > 0 ? formatVnd(t.amount) : ''}</td>
              <td className={cn(td, 'whitespace-nowrap text-right')}>
                {!t.transferId && (
                  <button onClick={() => onEdit(t)} title="Sửa" className="px-1 opacity-70 transition-opacity hover:opacity-100">✏️</button>
                )}
                <button onClick={() => onDelete(t)} title="Xóa" className="px-1 opacity-70 transition-opacity hover:opacity-100">🗑️</button>
              </td>
            </tr>
          ))}
          {txns.length === 0 && (
            <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">Chưa có giao dịch</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
