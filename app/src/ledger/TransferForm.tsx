import { useState } from 'react';
import { Modal } from '../plan/Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd } from '../budget/format';

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '6px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function TransferForm({ fromId, onClose }: { fromId: string; onClose: () => void }) {
  const { accounts, accountName, addTransfer } = useBudget();
  const others = accounts.filter((a) => a.id !== fromId);
  const today = new Date().toISOString().slice(0, 10);
  const [toId, setToId] = useState(others[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  async function go() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (!toId) { window.alert('Chọn tài khoản đích'); return; }
    await addTransfer(fromId, toId, amt, date);
    onClose();
  }

  return (
    <Modal title="Chuyển khoản giữa tài khoản" onClose={onClose}>
      <label style={{ fontSize: 11, color: '#999' }}>Từ</label>
      <div style={{ ...inp, background: '#f6f6f8' }}>{accountName(fromId)}</div>
      <label style={{ fontSize: 11, color: '#999' }}>Đến</label>
      <select style={inp} value={toId} onChange={(e) => setToId(e.target.value)}>
        {others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <label style={{ fontSize: 11, color: '#999' }}>Số tiền</label>
      <input style={inp} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 2.000.000" />
      <label style={{ fontSize: 11, color: '#999' }}>Ngày</label>
      <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button onClick={go} style={{ marginTop: 8, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Chuyển</button>
    </Modal>
  );
}
