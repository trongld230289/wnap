import { Fragment, useEffect, useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AvailableBar } from './AvailableBar';
import { formatVnd, parseVnd } from '../budget/format';
import { barFill } from '../budget/barFill';
import { STATUS_BAR_BG } from '../ui/statusColor';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Count } from '../delight/Count';
import { Sparkle } from '../delight/Sparkle';
import { useDelight } from '../delight/useDelight';
import { usePrevious } from '../delight/usePrevious';
import { detectRowSignal } from '../delight/signals';
import { SWEEP_MS, HEAL_MS, SPARKLE_MS } from '../delight/motion';
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
      <Count value={row.assigned} />
    </button>
  );
}

function CategoryRow({ row, onMoveMoney, onEditTarget }: {
  row: PlanRow;
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}) {
  const { categoryName } = useBudget();
  const { enabled } = useDelight();
  const { color } = barFill(row);
  const prevColor = usePrevious(color);
  const prevAssigned = usePrevious(row.assigned);

  const signal = prevColor === undefined
    ? 'none'
    : detectRowSignal({ color: prevColor, assigned: prevAssigned ?? row.assigned }, { color, assigned: row.assigned });

  const [receive, setReceive] = useState(false);
  const [heal, setHeal] = useState(false);
  const [spark, setSpark] = useState(false);
  const done = color === 'green';

  useEffect(() => {
    if (!enabled || signal === 'none') return;
    if (signal === 'assign') { setReceive(true); const t = setTimeout(() => setReceive(false), SWEEP_MS); return () => clearTimeout(t); }
    if (signal === 'cover') { setHeal(true); const t = setTimeout(() => setHeal(false), HEAL_MS); return () => clearTimeout(t); }
    if (signal === 'target-reached') { setSpark(true); const t = setTimeout(() => setSpark(false), SPARKLE_MS); return () => clearTimeout(t); }
  }, [signal, enabled]);

  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 text-left">
        <span className="inline-flex items-center gap-2">
          <span className={cn('dl-status', done && 'dl-done')}>
            <span className={cn('dl-dot', STATUS_BAR_BG[color])} />
            <svg viewBox="0 0 16 16"><path d="M4.5 8.3 L7 10.6 L11.5 5.6" /></svg>
            <Sparkle show={spark} />
          </span>
          {categoryName(row.categoryId)}
          <button onClick={() => onEditTarget(row.categoryId)} title="Mục tiêu" className="opacity-60 hover:opacity-100">🎯</button>
        </span>
      </td>
      <td className="px-3 py-2 text-right"><AssignedCell row={row} /></td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatVnd(row.activity)}</td>
      <td className={cn('relative px-3 py-2 text-right', receive && 'dl-receive', heal && 'dl-heal')}>
        <span className="dl-sweep" aria-hidden />
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
