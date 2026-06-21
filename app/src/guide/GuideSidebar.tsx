import { useGuideI18n } from './useGuideI18n';
import type { GuideTKey } from './guideDict';
import { PHASES, USE_CASES, type Phase } from './useCases';

export type SidebarSelection = { kind: 'overview' } | { kind: 'useCase'; id: string };

const PHASE_KEY: Record<Phase, GuideTKey> = {
  setup: 'guide.phase.setup',
  assign: 'guide.phase.assign',
  daily: 'guide.phase.daily',
  maint: 'guide.phase.maint',
  family: 'guide.phase.family',
  extras: 'guide.sidebar.extras',
};

export function GuideSidebar({
  selection,
  onSelect,
}: {
  selection: SidebarSelection;
  onSelect: (s: SidebarSelection) => void;
}) {
  const { t } = useGuideI18n();
  const isSelected = (s: SidebarSelection) =>
    s.kind === selection.kind &&
    (s.kind === 'overview' || s.id === (selection as { kind: 'useCase'; id: string }).id);
  const baseBtn = 'block w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-muted/50';
  const selBtn = 'bg-muted font-semibold';

  return (
    <>
      <select
        className="sm:hidden m-2 p-2 border rounded-md w-[calc(100%-1rem)]"
        value={selection.kind === 'overview' ? '__overview__' : selection.id}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__overview__') onSelect({ kind: 'overview' });
          else onSelect({ kind: 'useCase', id: v });
        }}
      >
        <option value="__overview__">{t('guide.sidebar.overview')}</option>
        {PHASES.map((phase) => {
          const items = USE_CASES.filter((u) => u.phase === phase);
          if (items.length === 0) return null;
          return (
            <optgroup key={phase} label={t(PHASE_KEY[phase])}>
              {items.map((u) => (
                <option key={u.id} value={u.id}>{t(u.titleKey as GuideTKey)}</option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <nav className="hidden sm:flex flex-col gap-1 p-2 overflow-y-auto">
        <button
          type="button"
          className={`${baseBtn} ${isSelected({ kind: 'overview' }) ? selBtn : ''}`}
          onClick={() => onSelect({ kind: 'overview' })}
        >
          {t('guide.sidebar.overview')}
        </button>
        {PHASES.map((phase) => {
          const items = USE_CASES.filter((u) => u.phase === phase);
          if (items.length === 0) return null;
          return (
            <details key={phase} open className="mt-2">
              <summary className="cursor-pointer px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                {t(PHASE_KEY[phase])}
              </summary>
              <div className="flex flex-col gap-0.5 mt-1">
                {items.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={`${baseBtn} pl-6 ${isSelected({ kind: 'useCase', id: u.id }) ? selBtn : ''}`}
                    onClick={() => onSelect({ kind: 'useCase', id: u.id })}
                  >
                    {t(u.titleKey as GuideTKey)}
                  </button>
                ))}
              </div>
            </details>
          );
        })}
      </nav>
    </>
  );
}
