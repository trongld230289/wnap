import { useBudget } from '../budget/useBudget';
import { PLAN_FILTERS, filterCounts } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';

export function FilterCards({ active, onToggle }: { active: FilterId | null; onToggle: (id: FilterId) => void }) {
  const { rows } = useBudget();
  const counts = filterCounts(rows);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {PLAN_FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onToggle(f.id)}
          style={{
            background: '#fff', borderRadius: 8, padding: '7px 11px', minWidth: 92, cursor: 'pointer',
            border: active === f.id ? '1px solid #2b6cb0' : '1px solid #e3e3e6',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>{counts[f.id]}</div>
          <div style={{ fontSize: 11, color: '#777' }}>{f.label}</div>
        </button>
      ))}
    </div>
  );
}
