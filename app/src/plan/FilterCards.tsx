import { useBudget } from '../budget/useBudget';
import { PLAN_FILTERS, filterCounts } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';
import { cn } from '@/lib/utils';
import { useI18n } from '../i18n/useI18n';
import type { TKey } from '../i18n/dict';

export function FilterCards({ active, onToggle }: { active: FilterId | null; onToggle: (id: FilterId) => void }) {
  const { rows } = useBudget();
  const { t } = useI18n();
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
          <div className="text-xs text-muted-foreground">{t(`filter.${f.id}` as TKey)}</div>
        </button>
      ))}
    </div>
  );
}
