import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import type { LedgerTxn } from '../lib/mappers';

const inp: React.CSSProperties = { border: '1px solid #cfd8d2', borderRadius: 5, padding: '5px 7px', fontSize: 12 };

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
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: '#fbfdfb', padding: 8, borderRadius: 8, border: '1px solid #e6efe8', marginBottom: 8 }}>
      <input style={{ ...inp, width: 120 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input style={{ ...inp, width: 130 }} placeholder="Payee" list="payee-list" value={payee} onChange={(e) => setPayee(e.target.value)} />
      <datalist id="payee-list">{payees.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <select style={{ ...inp, width: 160 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">— Chọn category —</option>
        {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input style={{ ...inp, width: 120 }} placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Outflow" value={outflow} onChange={(e) => setOutflow(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Inflow" value={inflow} onChange={(e) => setInflow(e.target.value)} />
      <button onClick={save} style={{ background: '#1f9d55', color: '#fff', border: 0, borderRadius: 5, padding: '5px 12px' }}>{editing ? 'Cập nhật' : 'Lưu'}</button>
      <button onClick={onDone} style={{ border: 0, background: 'none', color: '#888' }}>Hủy</button>
    </div>
  );
}
