import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AvailableBar } from './AvailableBar';
import { formatVnd, parseVnd } from '../budget/format';
import type { PlanRow } from '../engine';

function AssignedCell({ row }: { row: PlanRow }) {
  const { setAssigned } = useBudget();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing) {
    return (
      <input
        autoFocus value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => { setEditing(false); await setAssigned(row.categoryId, parseVnd(text)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ width: 90, textAlign: 'right' }}
      />
    );
  }
  return (
    <span
      onClick={() => { setText(String(row.assigned)); setEditing(true); }}
      style={{ color: '#2b6cb0', borderBottom: '1px dashed #b9c9da', cursor: 'text' }}
    >
      {formatVnd(row.assigned)}
    </span>
  );
}

interface Props {
  visibleRows: PlanRow[];
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}

export function CategoryTable({ visibleRows, onMoveMoney, onEditTarget }: Props) {
  const { groups, groupIdOf, categoryName } = useBudget();
  const byGroup = new Map<string, PlanRow[]>();
  for (const r of visibleRows) {
    const g = groupIdOf(r.categoryId);
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(r);
  }

  const cell: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' };
  const head: React.CSSProperties = { padding: '8px 12px', fontSize: 11, color: '#888', textAlign: 'right', borderBottom: '1px solid #eee' };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e3e3e6', borderRadius: 10 }}>
      <thead>
        <tr>
          <th style={{ ...head, textAlign: 'left' }}>Category</th>
          <th style={head}>Assigned</th><th style={head}>Activity</th><th style={head}>Available</th>
        </tr>
      </thead>
      <tbody>
        {groups.filter((g) => !g.isSystem).map((g) => {
          const rows = byGroup.get(g.id) ?? [];
          if (rows.length === 0) return null;
          return (
            <tr key={g.id}><td colSpan={4} style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td colSpan={4} style={{ background: '#f4f4f6', fontWeight: 600, color: '#444', padding: '7px 12px' }}>{g.name}</td></tr>
                  {rows.map((r) => (
                    <tr key={r.categoryId}>
                      <td style={{ ...cell, textAlign: 'left' }}>
                        {categoryName(r.categoryId)}
                        <button onClick={() => onEditTarget(r.categoryId)} title="Mục tiêu"
                          style={{ marginLeft: 6, border: 0, background: 'none', cursor: 'pointer', opacity: 0.6 }}>🎯</button>
                      </td>
                      <td style={cell}><AssignedCell row={r} /></td>
                      <td style={cell}>{formatVnd(r.activity)}</td>
                      <td style={cell}>
                        <span onClick={() => onMoveMoney(r.categoryId)} title="Chuyển tiền" style={{ cursor: 'pointer' }}>
                          <AvailableBar row={r} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td></tr>
          );
        })}
      </tbody>
    </table>
  );
}
