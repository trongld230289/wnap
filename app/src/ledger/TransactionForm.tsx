import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { parseVnd } from '../budget/format';

const inp: React.CSSProperties = { border: '1px solid #cfd8d2', borderRadius: 5, padding: '5px 7px', fontSize: 12 };

export function TransactionForm({ accountId, onDone }: { accountId: string; onDone: () => void }) {
  const { allCategories, upsertPayee, addTransaction } = useBudget();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [payee, setPayee] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [memo, setMemo] = useState('');
  const [outflow, setOutflow] = useState('');
  const [inflow, setInflow] = useState('');

  async function save() {
    const out = parseVnd(outflow);
    const inn = parseVnd(inflow);
    const amount = inn > 0 ? inn : -out;
    if (amount === 0) { window.alert('Nhập Outflow hoặc Inflow'); return; }
    const payeeId = payee.trim() ? await upsertPayee(payee) : null;
    await addTransaction({ accountId, date, payeeId, categoryId: categoryId || null, memo: memo.trim() || null, amount });
    onDone();
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: '#fbfdfb', padding: 8, borderRadius: 8, border: '1px solid #e6efe8', marginBottom: 8 }}>
      <input style={{ ...inp, width: 120 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input style={{ ...inp, width: 130 }} placeholder="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
      <select style={{ ...inp, width: 160 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">— Chọn category —</option>
        {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input style={{ ...inp, width: 120 }} placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Outflow" value={outflow} onChange={(e) => setOutflow(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Inflow" value={inflow} onChange={(e) => setInflow(e.target.value)} />
      <button onClick={save} style={{ background: '#1f9d55', color: '#fff', border: 0, borderRadius: 5, padding: '5px 12px' }}>Lưu</button>
      <button onClick={onDone} style={{ border: 0, background: 'none', color: '#888' }}>Hủy</button>
    </div>
  );
}
