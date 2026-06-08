import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { MonthNav } from './MonthNav';
import { RtaHeader } from './RtaHeader';
import { FilterCards } from './FilterCards';
import { CategoryTable } from './CategoryTable';
import { AssignPopover } from './AssignPopover';
import { MoveMoneyModal } from './MoveMoneyModal';
import { TargetEditorModal } from './TargetEditorModal';
import { PLAN_FILTERS } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';

type ModalState =
  | { type: 'assign' }
  | { type: 'move'; fromId: string }
  | { type: 'target'; categoryId: string }
  | null;

export function PlanScreen() {
  const { loading, rows, groups, addGroup, addCategory } = useBudget();
  const [active, setActive] = useState<FilterId | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  if (loading) return <p style={{ fontFamily: 'sans-serif', margin: 40 }}>Đang tải ngân sách…</p>;

  const predicate = active ? PLAN_FILTERS.find((f) => f.id === active)!.predicate : () => true;
  const visibleRows = rows.filter(predicate);
  const userGroups = groups.filter((g) => !g.isSystem);

  async function onAddGroup() {
    const name = window.prompt('Tên nhóm mới:');
    if (name) await addGroup(name);
  }
  async function onAddCategory() {
    if (userGroups.length === 0) { window.alert('Tạo nhóm trước đã.'); return; }
    const name = window.prompt('Tên category mới:');
    if (!name) return;
    await addCategory(userGroups[0].id, name, 'need');
  }

  return (
    <div style={{ maxWidth: 820, margin: '24px auto', fontFamily: 'sans-serif', padding: '0 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <MonthNav />
        <RtaHeader onAssign={() => setModal({ type: 'assign' })} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <FilterCards active={active} onToggle={(id) => setActive(active === id ? null : id)} />
      </div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button onClick={onAddGroup}>＋ Nhóm</button>
        <button onClick={onAddCategory}>＋ Category</button>
      </div>
      <CategoryTable
        visibleRows={visibleRows}
        onMoveMoney={(id) => setModal({ type: 'move', fromId: id })}
        onEditTarget={(id) => setModal({ type: 'target', categoryId: id })}
      />
      {modal?.type === 'assign' && <AssignPopover onClose={() => setModal(null)} />}
      {modal?.type === 'move' && <MoveMoneyModal fromId={modal.fromId} onClose={() => setModal(null)} />}
      {modal?.type === 'target' && <TargetEditorModal categoryId={modal.categoryId} onClose={() => setModal(null)} />}
    </div>
  );
}
