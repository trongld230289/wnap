import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';

export function RtaHeader({ onAssign }: { onAssign: () => void }) {
  const { rta } = useBudget();
  const bg = rta < 0 ? '#d23b3b' : rta === 0 ? '#9aa0a6' : '#1f9d55';
  return (
    <span style={{ background: bg, color: '#fff', padding: '8px 14px', borderRadius: 999, fontWeight: 600 }}>
      Ready to Assign: {formatVnd(rta)}₫
      <button onClick={onAssign} style={{ marginLeft: 10, background: 'rgba(255,255,255,.25)', color: '#fff', border: 0, borderRadius: 6, padding: '3px 9px', cursor: 'pointer' }}>＋ Assign</button>
    </span>
  );
}
