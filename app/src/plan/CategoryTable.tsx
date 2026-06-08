import { Fragment, useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AvailableBar } from './AvailableBar';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import type { PlanRow } from '../engine';

function AssignedCell({ row }: { row: PlanRow }) {
  const { setAssigned } = useBudget();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing) {
    return (
      <Input
        autoFocus value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => { setEditing(false); await setAssigned(row.categoryId, parseVnd(text)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="h-7 w-24 text-right"
      />
    );
  }
  return (
    <button onClick={() => { setText(String(row.assigned)); setEditing(true); }}
      className="cursor-text border-b border-dashed border-primary/40 text-primary tabular-nums">
      {formatVnd(row.assigned)}
    </button>
  );
}

function CategoryRow({ row, onMoveMoney, onEditTarget }: {
  row: PlanRow;
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}) {
  const { categoryName } = useBudget();
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 text-left">
        {categoryName(row.categoryId)}
        <button onClick={() => onEditTarget(row.categoryId)} title="Mục tiêu" className="ml-1.5 opacity-60 hover:opacity-100">🎯</button>
      </td>
      <td className="px-3 py-2 text-right"><AssignedCell row={row} /></td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatVnd(row.activity)}</td>
      <td className="px-3 py-2 text-right">
        <button onClick={() => onMoveMoney(row.categoryId)} title="Chuyển tiền" className="cursor-pointer"><AvailableBar row={row} /></button>
      </td>
    </tr>
  );
}

interface Props {
  visibleRows: PlanRow[];
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}

export function CategoryTable({ visibleRows, onMoveMoney, onEditTarget }: Props) {
  const { groups, groupIdOf } = useBudget();
  const byGroup = new Map<string, PlanRow[]>();
  for (const r of visibleRows) {
    const g = groupIdOf(r.categoryId);
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(r);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Category</th>
            <th className="px-3 py-2 text-right font-medium">Assigned</th>
            <th className="px-3 py-2 text-right font-medium">Activity</th>
            <th className="px-3 py-2 text-right font-medium">Available</th>
          </tr>
        </thead>
        <tbody>
          {groups.filter((g) => !g.isSystem).map((g) => {
            const rows = byGroup.get(g.id) ?? [];
            if (rows.length === 0) return null;
            return (
              <Fragment key={g.id}>
                <tr><td colSpan={4} className="bg-muted/60 px-3 py-1.5 font-semibold text-foreground/80">{g.name}</td></tr>
                {rows.map((r) => (
                  <CategoryRow key={r.categoryId} row={r} onMoveMoney={onMoveMoney} onEditTarget={onEditTarget} />
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
