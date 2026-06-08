import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';

const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', color: '#999', marginTop: 8, display: 'block' };
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '3px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function MoveMoneyModal({ fromId, onClose }: { fromId: string; onClose: () => void }) {
  const { rows, categoryName, moveMoney } = useBudget();
  const from = rows.find((r) => r.categoryId === fromId)!;
  const others = rows.filter((r) => r.categoryId !== fromId);
  const [toId, setToId] = useState(others[0]?.categoryId ?? '');
  const [amount, setAmount] = useState('');

  async function move() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (!toId) { window.alert('Chọn category đích'); return; }
    await moveMoney(fromId, toId, amt);
    onClose();
  }

  return (
    <Modal title="Chuyển tiền" onClose={onClose}>
      <label style={lbl}>Từ</label>
      <div style={{ ...inp, background: '#f6f6f8' }}>{categoryName(fromId)} — có {formatVnd(from.available)}₫</div>
      <label style={lbl}>Đến</label>
      <select style={inp} value={toId} onChange={(e) => setToId(e.target.value)}>
        {others.map((r) => (
          <option key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)} ({formatVnd(r.available)}₫)</option>
        ))}
      </select>
      <label style={lbl}>Số tiền</label>
      <input style={inp} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 200.000" />
      <button onClick={move} style={{ marginTop: 14, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Chuyển</button>
    </Modal>
  );
}
