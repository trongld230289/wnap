import { barFill } from '../budget/barFill';
import { formatVnd } from '../budget/format';
import type { PlanRow } from '../engine';

const COLOR: Record<string, string> = { red: '#d23b3b', yellow: '#caa007', green: '#1f9d55', gray: '#9aa0a6' };

export function AvailableBar({ row }: { row: PlanRow }) {
  const { pct, color } = barFill(row);
  const hex = COLOR[color];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
      <span style={{ width: 84, height: 8, background: '#eee', borderRadius: 999, overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct * 100}%`, background: hex }} />
      </span>
      <span style={{ minWidth: 80, textAlign: 'right', fontWeight: 600, color: hex }}>
        {formatVnd(row.available)}
      </span>
    </span>
  );
}
