import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { MonthNav } from './MonthNav';
import { RtaHeader } from './RtaHeader';
import { FilterCards } from './FilterCards';
import { CategoryTable } from './CategoryTable';
import { AssignPopover } from './AssignPopover';
import { MoveMoneyModal } from './MoveMoneyModal';
import { TargetEditorModal } from './TargetEditorModal';
import { ActivityDialog } from './ActivityDialog';
import { AddCategoryModal } from './AddCategoryModal';
import { PLAN_FILTERS } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';
import { Button } from '@/components/ui/button';
import { useDialogs } from '../components/feedback/DialogProvider';
import { useI18n } from '../i18n/useI18n';

type ModalState =
  | { type: 'assign' }
  | { type: 'move'; fromId: string }
  | { type: 'target'; categoryId: string }
  | { type: 'addCategory' }
  | null;

export function PlanScreen() {
  const { loading, rows, groups, addGroup } = useBudget();
  const { prompt, notify } = useDialogs();
  const { t } = useI18n();
  const [active, setActive] = useState<FilterId | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [showActivity, setShowActivity] = useState(false);

  if (loading) return <p className="m-10 text-muted-foreground">{t('plan.loading')}</p>;

  const predicate = active ? PLAN_FILTERS.find((f) => f.id === active)!.predicate : () => true;
  const visibleRows = rows.filter(predicate);
  const userGroups = groups.filter((g) => !g.isSystem);

  async function onAddGroup() {
    const name = await prompt({ title: t('plan.newGroup'), label: t('plan.groupName'), placeholder: t('plan.groupPlaceholder'), confirmText: t('plan.create') });
    if (name) await addGroup(name);
  }
  async function onAddCategory() {
    if (userGroups.length === 0) {
      await notify({ title: t('plan.noGroupTitle'), description: t('plan.noGroupDesc') });
      return;
    }
    setModal({ type: 'addCategory' });
  }

  return (
    <div className="mx-auto max-w-[980px] px-3 py-6">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNav />
        <RtaHeader onAssign={() => setModal({ type: 'assign' })} />
      </div>
      <div className="mb-3">
        <FilterCards active={active} onToggle={(id) => setActive(active === id ? null : id)} />
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onAddGroup}>{t('plan.addGroup')}</Button>
        <Button variant="outline" size="sm" onClick={onAddCategory}>{t('plan.addCategory')}</Button>
        <Button variant="outline" size="sm" onClick={() => setShowActivity(true)}>{t('plan.activity')}</Button>
      </div>
      <div className="overflow-x-auto">
        <CategoryTable
          visibleRows={visibleRows}
          onMoveMoney={(id) => setModal({ type: 'move', fromId: id })}
          onEditTarget={(id) => setModal({ type: 'target', categoryId: id })}
        />
      </div>
      {modal?.type === 'assign' && <AssignPopover onClose={() => setModal(null)} />}
      {modal?.type === 'move' && <MoveMoneyModal fromId={modal.fromId} onClose={() => setModal(null)} />}
      {modal?.type === 'target' && <TargetEditorModal categoryId={modal.categoryId} onClose={() => setModal(null)} />}
      {modal?.type === 'addCategory' && <AddCategoryModal onClose={() => setModal(null)} />}
      {showActivity && <ActivityDialog onClose={() => setShowActivity(false)} />}
    </div>
  );
}
