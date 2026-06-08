import { useBudget } from '../budget/useBudget';
import { PLAN_FILTERS, filterCounts } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';
import { cn } from '@/lib/utils';

export function FilterCards({ active, onToggle }: { active: FilterId | null; onToggle: (id: FilterId) => void }) {
  const { rows } = useBudget();
  const counts = filterCounts(rows);
  return (
    <div className="flex flex-wrap gap-2">
      {PLAN_FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onToggle(f.id)}
          className={cn(
            'min-w-[92px] rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-accent',
            active === f.id ? 'border-primary ring-1 ring-primary' : 'border-border',
          )}
        >
          <div className="text-lg font-bold tabular-nums">{counts[f.id]}</div>
          <div className="text-xs text-muted-foreground">{f.label}</div>
        </button>
      ))}
    </div>
  );
}
