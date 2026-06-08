import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import type { TargetStrategy, TargetCadence } from '../engine';

const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', color: '#999', marginTop: 8, display: 'block' };
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '3px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function TargetEditorModal({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const { rows, categoryName, setTarget, removeTarget, setSnooze } = useBudget();
  const row = rows.find((r) => r.categoryId === categoryId)!;
  const t = row.target;
  const [strategy, setStrategy] = useState<TargetStrategy>(t?.strategy ?? 'set_aside');
  const [amount, setAmount] = useState(t ? formatVnd(t.amount) : '');
  const [cadence, setCadence] = useState<TargetCadence>(t?.cadence ?? 'monthly');
  const [dueDay, setDueDay] = useState(t?.dueDay != null ? String(t.dueDay) : '');
  const [dueWeekday, setDueWeekday] = useState(t?.dueWeekday != null ? String(t.dueWeekday) : '1');
  const [dueDate, setDueDate] = useState(t?.dueDate ?? '');

  const needsDate = strategy === 'have_balance' || cadence === 'yearly' || cadence === 'custom';
  const isWeekly = cadence === 'weekly';

  async function save() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (needsDate && !dueDate) { window.alert('Chọn ngày hạn (deadline)'); return; }
    await setTarget(categoryId, {
      strategy, amount: amt, cadence,
      dueDay: !needsDate && !isWeekly && dueDay ? Number(dueDay) : null,
      dueWeekday: isWeekly ? Number(dueWeekday) : null,
      dueDate: needsDate ? dueDate : null,
    });
    onClose();
  }

  return (
    <Modal title={`Mục tiêu · ${categoryName(categoryId)}`} onClose={onClose}>
      <label style={lbl}>Chiến lược</label>
      <select style={inp} value={strategy} onChange={(e) => setStrategy(e.target.value as TargetStrategy)}>
        <option value="set_aside">Set aside (gom đều mỗi tháng)</option>
        <option value="refill">Refill up to (bơm đầy tới mức)</option>
        <option value="have_balance">Have balance by (đạt số dư trước hạn)</option>
      </select>
      <label style={lbl}>Số tiền</label>
      <input style={inp} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 600.000" />
      <label style={lbl}>Chu kỳ</label>
      <select style={inp} value={cadence} onChange={(e) => setCadence(e.target.value as TargetCadence)}>
        <option value="monthly">Hằng tháng</option>
        <option value="weekly">Hằng tuần</option>
        <option value="yearly">Hằng năm</option>
        <option value="custom">Tùy chỉnh (theo hạn)</option>
      </select>
      {isWeekly && (
        <>
          <label style={lbl}>Thứ trong tuần</label>
          <select style={inp} value={dueWeekday} onChange={(e) => setDueWeekday(e.target.value)}>
            <option value="1">Thứ 2</option><option value="2">Thứ 3</option><option value="3">Thứ 4</option>
            <option value="4">Thứ 5</option><option value="5">Thứ 6</option><option value="6">Thứ 7</option><option value="0">Chủ nhật</option>
          </select>
        </>
      )}
      {needsDate && (
        <>
          <label style={lbl}>Hạn (deadline)</label>
          <input style={inp} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </>
      )}
      {!isWeekly && !needsDate && (
        <>
          <label style={lbl}>Ngày đến hạn trong tháng (tùy chọn, 1–31)</label>
          <input style={inp} value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="vd 15" />
        </>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={save} style={{ flex: 1, background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Lưu</button>
        <button onClick={async () => { await setSnooze(categoryId, !row.snoozed); onClose(); }}>
          {row.snoozed ? 'Bỏ snooze' : '😴 Snooze tháng này'}
        </button>
      </div>
      {t && (
        <button onClick={async () => { await removeTarget(categoryId); onClose(); }}
          style={{ marginTop: 8, color: '#c0392b', background: 'none', border: 0, cursor: 'pointer' }}>
          Xóa mục tiêu
        </button>
      )}
    </Modal>
  );
}
