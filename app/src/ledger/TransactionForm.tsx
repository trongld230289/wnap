import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LedgerTxn } from '../lib/mappers';

export function TransactionForm({ accountId, editing, onDone }: { accountId: string; editing: LedgerTxn | null; onDone: () => void }) {
  const { allCategories, payees, upsertPayee, addTransaction, updateTransaction } = useBudget();
  const today = new Date().toISOString().slice(0, 10);
  const payeeName0 = editing?.payeeId ? payees.find((p) => p.id === editing.payeeId)?.name ?? '' : '';
  const [date, setDate] = useState(editing?.date ?? today);
  const [payee, setPayee] = useState(payeeName0);
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [outflow, setOutflow] = useState(editing && editing.amount < 0 ? formatVnd(-editing.amount) : '');
  const [inflow, setInflow] = useState(editing && editing.amount > 0 ? formatVnd(editing.amount) : '');

  async function save() {
    const out = parseVnd(outflow);
    const inn = parseVnd(inflow);
    const amount = inn > 0 ? inn : -out;
    if (amount === 0) { window.alert('Nhập Outflow hoặc Inflow'); return; }
    const payeeId = payee.trim() ? await upsertPayee(payee) : null;
    const patch = { date, payeeId, categoryId: categoryId || null, memo: memo.trim() || null, amount };
    if (editing) await updateTransaction(editing.id, patch);
    else await addTransaction({ accountId, ...patch });
    onDone();
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 p-2.5">
      <Input className="h-8 w-32" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input className="h-8 w-36" placeholder="Payee" list="payee-list" value={payee} onChange={(e) => setPayee(e.target.value)} />
      <datalist id="payee-list">{payees.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="h-8 w-44" size="sm"><SelectValue placeholder="— Chọn category —" /></SelectTrigger>
        <SelectContent>
          {allCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="h-8 w-32" placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <Input className="h-8 w-24 text-right tabular-nums" placeholder="Outflow" value={outflow} onChange={(e) => setOutflow(e.target.value)} />
      <Input className="h-8 w-24 text-right tabular-nums" placeholder="Inflow" value={inflow} onChange={(e) => setInflow(e.target.value)} />
      <Button size="sm" onClick={save}>{editing ? 'Cập nhật' : 'Lưu'}</Button>
      <Button size="sm" variant="ghost" onClick={onDone}>Hủy</Button>
    </div>
  );
}
