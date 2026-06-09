import { useBudget } from '../budget/useBudget';
import { groupAccounts } from './ledgerGroups';
import { formatVnd } from '../budget/format';
import { cn } from '@/lib/utils';

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
    <button
      key={id}
      onClick={() => onSelect(id)}
      className={cn(
        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors',
        selected === id ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground hover:bg-muted',
      )}
    >
      <span className="truncate">{name}</span>
      <span className={cn('tabular-nums', selected === id ? 'text-accent-foreground/80' : 'text-muted-foreground')}>{formatVnd(working)}</span>
    </button>
  );
  const grpLabel = (s: string) => <div className="mb-1 mt-3 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{s}</div>;

  return (
    <div className="w-full shrink-0 border-b bg-muted/40 p-2.5 text-[13px] sm:w-48 sm:border-b-0 sm:border-r">
      {item('all', 'Tất cả tài khoản', g.total)}
      {g.cash.length > 0 && grpLabel('Tiền mặt')}
      {g.cash.map((a) => item(a.id, a.name, a.working))}
      {g.savings.length > 0 && grpLabel('Tiết kiệm')}
      {g.savings.map((a) => item(a.id, a.name, a.working))}
      <button onClick={onAdd} className="mt-3 px-2 text-sm text-primary hover:underline">＋ Thêm tài khoản</button>
    </div>
  );
}
