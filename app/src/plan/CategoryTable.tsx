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
import { useI18n } from '../i18n/useI18n';
import { useDialogs } from '../components/feedback/DialogProvider';
import type { PlanRow } from '../engine';

function AssignedCell({ row }: { row: PlanRow }) {
  const { setAssigned } = useBudget();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing) {
    return (
      <Input
        inputMode="numeric"
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

function CategoryNameCell({ categoryId, name }: { categoryId: string; name: string }) {
  const { renameCategory } = useBudget();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(name);

  if (editing) {
    return (
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => { setEditing(false); if (text.trim() && text.trim() !== name) await renameCategory(categoryId, text); else setText(name); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setText(name); setEditing(false); } }}
        className="h-7 w-40 max-w-[160px] sm:max-w-none"
      />
    );
  }
  return (
    <button
      onClick={() => { setText(name); setEditing(true); }}
      title={t('plan.renameTip')}
      className="max-w-[120px] cursor-text truncate text-left hover:text-primary sm:max-w-none"
    >
      {name}
    </button>
  );
}

function GroupHeaderRow({ groupId, name }: { groupId: string; name: string }) {
  const { renameGroup, archiveGroup } = useBudget();
  const { confirm, notify } = useDialogs();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(name);

  async function onDelete() {
    const ok = await confirm({
      title: t('plan.deleteGroupTitle', { name }),
      description: t('plan.deleteGroupDesc'),
      confirmText: t('plan.delete'),
      destructive: true,
    });
    if (!ok) return;
    const res = await archiveGroup(groupId);
    if (!res.ok && res.reason === 'not-empty') {
      await notify({ title: t('plan.deleteGroupBlockedTitle'), description: t('plan.deleteGroupBlockedDesc') });
    }
  }

  return (
    <tr>
      <td colSpan={4} className="bg-muted/60 px-3 py-1.5 font-semibold text-foreground/80">
        <span className="inline-flex w-full items-center gap-2">
          {editing ? (
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={async () => { setEditing(false); if (text.trim() && text.trim() !== name) await renameGroup(groupId, text); else setText(name); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setText(name); setEditing(false); } }}
              className="h-7 w-56 font-semibold"
            />
          ) : (
            <button
              onClick={() => { setText(name); setEditing(true); }}
              title={t('plan.renameTip')}
              className="cursor-text text-left hover:text-primary"
            >
              {name}
            </button>
          )}
          <button onClick={onDelete} title={t('plan.deleteGroupTip')} className="opacity-50 hover:opacity-100">🗑️</button>
        </span>
      </td>
    </tr>
  );
}

function CategoryRow({ row, onMoveMoney, onEditTarget }: {
  row: PlanRow;
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}) {
  const { categoryName, archiveCategory } = useBudget();
  const { confirm } = useDialogs();
  const { enabled } = useDelight();
  const { t } = useI18n();

  async function onDelete() {
    const ok = await confirm({
      title: t('plan.deleteCategoryTitle', { name: categoryName(row.categoryId) }),
      description: t('plan.deleteCategoryDesc'),
      confirmText: t('plan.delete'),
      destructive: true,
    });
    if (ok) await archiveCategory(row.categoryId);
  }
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
      <td className="px-2 py-2 text-left sm:px-3">
        <span className="inline-flex items-center gap-2">
          <span className={cn('dl-status', done && 'dl-done')}>
            <span className={cn('dl-dot', STATUS_BAR_BG[color])} />
            <svg viewBox="0 0 16 16"><path d="M4.5 8.3 L7 10.6 L11.5 5.6" /></svg>
            <Sparkle show={spark} />
          </span>
          <CategoryNameCell categoryId={row.categoryId} name={categoryName(row.categoryId)} />
          <button onClick={() => onEditTarget(row.categoryId)} title={t('cat.targetTip')} className="opacity-60 hover:opacity-100">🎯</button>
          <button onClick={onDelete} title={t('plan.deleteCategoryTip')} className="opacity-40 hover:opacity-100">🗑️</button>
        </span>
      </td>
      <td className="px-2 py-2 text-right sm:px-3"><AssignedCell row={row} /></td>
      <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">{formatVnd(row.activity)}</td>
      <td className={cn('relative px-2 py-2 text-right sm:px-3', receive && 'dl-receive', heal && 'dl-heal')}>
        <span className="dl-sweep" aria-hidden />
        <button onClick={() => onMoveMoney(row.categoryId)} title={t('move.title')} className="cursor-pointer"><AvailableBar row={row} /></button>
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
  const { t } = useI18n();
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
            <th className="px-2 py-2 text-left font-medium sm:px-3">{t('col.category')}</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">{t('col.assigned')}</th>
            <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">{t('col.activity')}</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">{t('col.available')}</th>
          </tr>
        </thead>
        <tbody>
          {groups.filter((g) => !g.isSystem).map((g) => {
            const rows = byGroup.get(g.id) ?? [];
            return (
              <Fragment key={g.id}>
                <GroupHeaderRow groupId={g.id} name={g.name} />
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-2 text-xs text-muted-foreground italic">{t('plan.emptyGroup')}</td></tr>
                )}
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
