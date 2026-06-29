# Reorder Groups & Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual reorder UI (up/down buttons in two modals) for category groups and for categories within a group, and make newly created groups/categories land at the bottom of their list automatically.

**Architecture:** No drag-and-drop library. Two new modals (`ReorderGroupsModal`, `ReorderCategoriesModal`) each render a shared `ReorderList` component with `↑` / `↓` buttons + Save. Reorder writes go through a single Supabase `upsert` over the existing `sort_order` column on `category_groups` and `categories`. The insert paths (`addGroup`, `addCategory`) are also fixed to compute `max + 1` so new items go last without using the modal.

**Tech Stack:** React 19 + TypeScript, Radix UI (existing `Dialog`, `Select`), Tailwind 4, Supabase JS client, Vitest + Testing Library. **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-06-29-reorder-groups-categories-design.md`

## Global Constraints

- **No new dependencies.** No `@dnd-kit`, no `react-dnd`, no library additions of any kind.
- **No schema migration.** Both `category_groups.sort_order` and `categories.sort_order` already exist (`supabase/migrations/0001_schema.sql:39,48`).
- **System "Inflow: Ready to Assign" group** stays pinned at `sort_order = 999` and is filtered out of all reorder UI (it has `is_system = true`).
- **i18n is mandatory.** Every new user-visible string goes through `t(...)` and has both `vi` and `en` entries added to `app/src/i18n/dict.ts` in the same commit.
- **TDD with Vitest.** Each pure helper or component gets its test written first and verified failing before implementation.
- **Frequent commits.** One commit per task. Commit message style matches the repo (`feat(plan): …`, `test(plan): …`, etc. — see recent commits via `git log --oneline`).

---

## Task 1: Expose `sortOrder` through the data layer

**Files:**
- Modify: `app/src/lib/mappers.ts` (add `sort_order` to `RawCategory`; export new pure helper `nextSortOrder`)
- Modify: `app/src/budget/useBudget.tsx` (extend `groups` shape with `sortOrder`; map it in `fetchRaw`)
- Test: `app/src/lib/__tests__/nextSortOrder.test.ts` (new)
- Test: `app/src/budget/__tests__/mappers.test.ts` (extend if it asserts `RawCategory` shape)

**Interfaces produced:**
- `RawCategory` interface gains `sort_order: number`.
- `BudgetCtx['groups']` element shape gains `sortOrder: number`.
- `nextSortOrder<T extends { sortOrder: number }>(items: T[]): number` — returns `max(sortOrder) + 1`, or `1` if the array is empty.

**Interfaces consumed:** none (this is the foundation task).

- [ ] **Step 1: Write the failing test for `nextSortOrder`**

Create `app/src/lib/__tests__/nextSortOrder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextSortOrder } from '../mappers';

describe('nextSortOrder', () => {
  it('returns 1 for an empty list', () => {
    expect(nextSortOrder([])).toBe(1);
  });

  it('returns max(sortOrder) + 1', () => {
    expect(nextSortOrder([{ sortOrder: 2 }, { sortOrder: 5 }, { sortOrder: 3 }])).toBe(6);
  });

  it('handles a single item', () => {
    expect(nextSortOrder([{ sortOrder: 7 }])).toBe(8);
  });

  it('ignores other fields', () => {
    expect(nextSortOrder([{ id: 'a', name: 'x', sortOrder: 4 } as unknown as { sortOrder: number }])).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && npm test -- nextSortOrder`
Expected: FAIL with `nextSortOrder is not exported from '../mappers'`.

- [ ] **Step 3: Implement `nextSortOrder` in `app/src/lib/mappers.ts`**

Append to `app/src/lib/mappers.ts`:

```ts
export function nextSortOrder<T extends { sortOrder: number }>(items: T[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.sortOrder)) + 1;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app && npm test -- nextSortOrder`
Expected: PASS (4 tests).

- [ ] **Step 5: Add `sort_order` to `RawCategory`**

In `app/src/lib/mappers.ts:6`, change:

```ts
export interface RawCategory { id: string; group_id: string; name: string; kind: Category['kind']; is_system: boolean; }
```

to:

```ts
export interface RawCategory { id: string; group_id: string; name: string; kind: Category['kind']; is_system: boolean; sort_order: number; }
```

This matches the columns already selected at `app/src/budget/useBudget.tsx:84`.

- [ ] **Step 6: Expose `sortOrder` on the `groups` array in `useBudget`**

In `app/src/budget/useBudget.tsx:38`, change:

```ts
groups: { id: string; name: string; isSystem: boolean }[];
```

to:

```ts
groups: { id: string; name: string; isSystem: boolean; sortOrder: number }[];
```

Then in `fetchRaw` at `app/src/budget/useBudget.tsx:102`, change:

```ts
groups: (g.data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, isSystem: r.is_system as boolean })),
```

to:

```ts
groups: (g.data ?? []).map((r) => ({
  id: r.id as string,
  name: r.name as string,
  isSystem: r.is_system as boolean,
  sortOrder: r.sort_order as number,
})),
```

- [ ] **Step 7: Run the full test suite + build**

Run: `cd app && npm test`
Expected: all tests pass (`mappers.test.ts` should still pass — the new `sort_order` field is optional from its perspective since the test constructs `RawAccount`, not `RawCategory`; if it does construct `RawCategory` anywhere, add `sort_order: 0` to each literal).

Run: `cd app && npm run build`
Expected: build succeeds with no TypeScript errors. If `app/src/budget/__tests__/mappers.test.ts` fails to compile because of a missing `sort_order` field on a `RawCategory` literal, add `sort_order: 0` to each affected literal.

- [ ] **Step 8: Commit**

```bash
git add app/src/lib/mappers.ts app/src/lib/__tests__/nextSortOrder.test.ts app/src/budget/useBudget.tsx app/src/budget/__tests__/mappers.test.ts
git commit -m "feat(plan): expose sortOrder + add nextSortOrder helper"
```

---

## Task 2: New items land at the bottom

**Files:**
- Modify: `app/src/budget/useBudget.tsx:163-178` (`addGroup`, `addCategory`)
- Test: (manual — `addGroup` / `addCategory` are thin Supabase wrappers; covered by the manual verification checklist below)

**Interfaces produced:** behavioral change only — no new exports.

**Interfaces consumed:**
- `nextSortOrder` from Task 1.
- `BudgetCtx['groups']` element shape (now includes `sortOrder`) from Task 1.
- `raw.categories[].sort_order` (now typed) from Task 1.

- [ ] **Step 1: Update `addGroup` to set `sort_order = max + 1` among non-system groups**

In `app/src/budget/useBudget.tsx`, replace the `addGroup` definition (currently lines 163-166):

```ts
const addGroup = useCallback(async (name: string) => {
  await supabase.from('category_groups').insert({ budget_id: budgetId, name });
  await refetch();
}, [budgetId, refetch]);
```

with:

```ts
const addGroup = useCallback(async (name: string) => {
  const sortOrder = nextSortOrder(groups.filter((g) => !g.isSystem));
  await supabase.from('category_groups').insert({ budget_id: budgetId, name, sort_order: sortOrder });
  await refetch();
}, [budgetId, refetch, groups]);
```

Also add `nextSortOrder` to the import at the top:

```ts
import { toBudgetInput, deriveFirstMonth, mapAccounts, mapPayees, mapLedgerTxns, nextSortOrder } from '../lib/mappers';
```

- [ ] **Step 2: Update `addCategory` to set `sort_order = max + 1` within the target group**

In `app/src/budget/useBudget.tsx`, replace the `addCategory` definition (currently lines 175-178):

```ts
const addCategory = useCallback(async (groupId: string, name: string, kind: string) => {
  await supabase.from('categories').insert({ budget_id: budgetId, group_id: groupId, name, kind });
  await refetch();
}, [budgetId, refetch]);
```

with:

```ts
const addCategory = useCallback(async (groupId: string, name: string, kind: string) => {
  const siblings = raw.categories
    .filter((c) => c.group_id === groupId)
    .map((c) => ({ sortOrder: c.sort_order }));
  const sortOrder = nextSortOrder(siblings);
  await supabase.from('categories').insert({ budget_id: budgetId, group_id: groupId, name, kind, sort_order: sortOrder });
  await refetch();
}, [budgetId, refetch, raw]);
```

- [ ] **Step 3: Run the full test suite + build**

Run: `cd app && npm test && npm run build`
Expected: all pass, no TS errors.

- [ ] **Step 4: Manual verification**

```bash
cd app && npm run dev
```

In the browser:
1. Plan screen → `+ Group` → create "ZZ Test Group" → it appears at the **bottom** of the list (above the hidden system group).
2. Click `+ Category` → pick any existing group → create "zz test cat" → it appears at the **bottom of that group**.
3. Refresh the page → both still in those positions (persisted, not just local sort).
4. Delete the two test items via 🗑️.

- [ ] **Step 5: Commit**

```bash
git add app/src/budget/useBudget.tsx
git commit -m "feat(plan): new groups & categories land at the bottom of their list"
```

---

## Task 3: `reorderMove` helper + `ReorderList` component

**Files:**
- Create: `app/src/plan/reorderMove.ts`
- Create: `app/src/plan/__tests__/reorderMove.test.ts`
- Create: `app/src/plan/ReorderList.tsx`
- Create: `app/src/plan/__tests__/ReorderList.test.tsx`

**Interfaces produced:**
- `move<T>(list: T[], index: number, dir: -1 | 1): T[]` — pure swap; returns a new array (or the same reference if the move is out-of-bounds).
- `ReorderList` React component with props:
  ```ts
  interface ReorderListProps {
    items: Array<{ id: string; name: string }>;
    onMove: (fromIndex: number, direction: -1 | 1) => void;
    upLabel: (name: string) => string;   // aria-label for the ↑ button
    downLabel: (name: string) => string; // aria-label for the ↓ button
  }
  ```

**Interfaces consumed:** none.

- [ ] **Step 1: Write the failing test for `move`**

Create `app/src/plan/__tests__/reorderMove.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { move } from '../reorderMove';

const list = ['a', 'b', 'c', 'd'];

describe('move', () => {
  it('moves an item down by one', () => {
    expect(move(list, 1, 1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves an item up by one', () => {
    expect(move(list, 2, -1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('is a no-op at the top edge', () => {
    expect(move(list, 0, -1)).toEqual(list);
  });

  it('is a no-op at the bottom edge', () => {
    expect(move(list, list.length - 1, 1)).toEqual(list);
  });

  it('returns a new array (does not mutate)', () => {
    const original = ['x', 'y', 'z'];
    const result = move(original, 0, 1);
    expect(result).not.toBe(original);
    expect(original).toEqual(['x', 'y', 'z']);
  });

  it('is a no-op on a single-item list', () => {
    expect(move(['only'], 0, -1)).toEqual(['only']);
    expect(move(['only'], 0, 1)).toEqual(['only']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && npm test -- reorderMove`
Expected: FAIL — module `'../reorderMove'` cannot be found.

- [ ] **Step 3: Implement `move` in `app/src/plan/reorderMove.ts`**

Create `app/src/plan/reorderMove.ts`:

```ts
export function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app && npm test -- reorderMove`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing test for `ReorderList`**

Create `app/src/plan/__tests__/ReorderList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReorderList } from '../ReorderList';

const items = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Bravo' },
  { id: '3', name: 'Charlie' },
];

describe('ReorderList', () => {
  it("disables the first row's up button and the last row's down button", () => {
    render(
      <ReorderList
        items={items}
        onMove={() => {}}
        upLabel={(n) => `Up ${n}`}
        downLabel={(n) => `Down ${n}`}
      />,
    );
    expect(screen.getByLabelText('Up Alpha')).toBeDisabled();
    expect(screen.getByLabelText('Down Alpha')).not.toBeDisabled();
    expect(screen.getByLabelText('Up Charlie')).not.toBeDisabled();
    expect(screen.getByLabelText('Down Charlie')).toBeDisabled();
  });

  it('calls onMove with the right index and direction', async () => {
    const onMove = vi.fn();
    render(
      <ReorderList items={items} onMove={onMove} upLabel={(n) => `Up ${n}`} downLabel={(n) => `Down ${n}`} />,
    );
    await userEvent.click(screen.getByLabelText('Down Bravo'));
    expect(onMove).toHaveBeenCalledWith(1, 1);
    await userEvent.click(screen.getByLabelText('Up Charlie'));
    expect(onMove).toHaveBeenCalledWith(2, -1);
  });

  it('disables both buttons for a single-item list', () => {
    render(
      <ReorderList
        items={[{ id: 'only', name: 'Only' }]}
        onMove={() => {}}
        upLabel={(n) => `Up ${n}`}
        downLabel={(n) => `Down ${n}`}
      />,
    );
    expect(screen.getByLabelText('Up Only')).toBeDisabled();
    expect(screen.getByLabelText('Down Only')).toBeDisabled();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd app && npm test -- ReorderList`
Expected: FAIL — module `'../ReorderList'` cannot be found.

- [ ] **Step 7: Implement `ReorderList` in `app/src/plan/ReorderList.tsx`**

Create `app/src/plan/ReorderList.tsx`:

```tsx
import { Button } from '@/components/ui/button';

interface ReorderListProps {
  items: Array<{ id: string; name: string }>;
  onMove: (fromIndex: number, direction: -1 | 1) => void;
  upLabel: (name: string) => string;
  downLabel: (name: string) => string;
}

export function ReorderList({ items, onMove, upLabel, downLabel }: ReorderListProps) {
  return (
    <ul className="divide-y rounded-md border">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="truncate text-sm">{item.name}</span>
          <span className="flex shrink-0 gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={upLabel(item.name)}
              disabled={i === 0}
              onClick={() => onMove(i, -1)}
            >
              ↑
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={downLabel(item.name)}
              disabled={i === items.length - 1}
              onClick={() => onMove(i, 1)}
            >
              ↓
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd app && npm test -- ReorderList`
Expected: PASS (3 tests). If `userEvent` requires async setup (`userEvent.setup()`), update the test accordingly — but with `@testing-library/user-event ^14`, `userEvent.click` direct usage works.

- [ ] **Step 9: Run the full suite + build**

Run: `cd app && npm test && npm run build`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add app/src/plan/reorderMove.ts app/src/plan/ReorderList.tsx app/src/plan/__tests__/reorderMove.test.ts app/src/plan/__tests__/ReorderList.test.tsx
git commit -m "feat(plan): add ReorderList component + reorderMove helper"
```

---

## Task 4: Group reorder — modal + `reorderGroups` + wiring

**Files:**
- Create: `app/src/plan/ReorderGroupsModal.tsx`
- Modify: `app/src/budget/useBudget.tsx` (add `reorderGroups` to context)
- Modify: `app/src/plan/PlanScreen.tsx` (add button + modal state + render)
- Modify: `app/src/i18n/dict.ts` (add `plan.reorder.*` keys, both `vi` and `en`)

**Interfaces produced:**
- `BudgetCtx.reorderGroups: (orderedIds: string[]) => Promise<void>` — performs one Supabase `upsert` mapping `orderedIds[i]` → `sort_order = i + 1`, then `refetch()`.
- `t('plan.reorder.reorderGroups')` (and other keys below) available throughout the i18n dictionary.

**Interfaces consumed:**
- `ReorderList`, `move` from Task 3.
- `BudgetCtx['groups']` shape (with `sortOrder`) from Task 1.

- [ ] **Step 1: Add i18n keys for the reorder feature**

In `app/src/i18n/dict.ts`, add inside the **`vi` block** (alongside other `plan.*` keys around line 76):

```ts
// reorder
'plan.reorder.reorderGroups': 'Sắp xếp nhóm',
'plan.reorder.reorderCategories': 'Sắp xếp danh mục',
'plan.reorder.groupsTitle': 'Sắp xếp nhóm',
'plan.reorder.categoriesTitle': 'Sắp xếp danh mục',
'plan.reorder.groupPicker': 'Chọn nhóm',
'plan.reorder.empty': 'Không có gì để sắp xếp',
'plan.reorder.moveUp': 'Di chuyển {name} lên',
'plan.reorder.moveDown': 'Di chuyển {name} xuống',
'plan.reorder.discardTitle': 'Bỏ thay đổi?',
'plan.reorder.discardDesc': 'Các thay đổi sắp xếp chưa lưu sẽ bị mất.',
'plan.reorder.saved': 'Đã lưu thứ tự',
'plan.reorder.saveError': 'Không lưu được — thử lại.',
```

Then add the same keys inside the **`en` block** (alongside `plan.*` keys around line 284):

```ts
// reorder
'plan.reorder.reorderGroups': 'Reorder groups',
'plan.reorder.reorderCategories': 'Reorder categories',
'plan.reorder.groupsTitle': 'Reorder groups',
'plan.reorder.categoriesTitle': 'Reorder categories',
'plan.reorder.groupPicker': 'Pick a group',
'plan.reorder.empty': 'Nothing to reorder',
'plan.reorder.moveUp': 'Move {name} up',
'plan.reorder.moveDown': 'Move {name} down',
'plan.reorder.discardTitle': 'Discard changes?',
'plan.reorder.discardDesc': 'Unsaved reorder changes will be lost.',
'plan.reorder.saved': 'Order saved',
'plan.reorder.saveError': "Couldn't save — try again.",
```

- [ ] **Step 2: Add `reorderGroups` to the `BudgetCtx` interface**

In `app/src/budget/useBudget.tsx:68`, add inside the `BudgetCtx` interface (e.g. right after `archiveGroup`):

```ts
reorderGroups: (orderedIds: string[]) => Promise<void>;
```

- [ ] **Step 3: Implement `reorderGroups` in `BudgetProvider`**

In `app/src/budget/useBudget.tsx`, add this `useCallback` near the other group methods (after `archiveGroup`, around line 199):

```ts
const reorderGroups = useCallback(async (orderedIds: string[]) => {
  if (orderedIds.length === 0) return;
  await supabase
    .from('category_groups')
    .upsert(
      orderedIds.map((id, i) => ({ id, sort_order: i + 1 })),
      { onConflict: 'id' },
    );
  await refetch();
}, [refetch]);
```

Then include it in the context value at `app/src/budget/useBudget.tsx:303`:

```ts
refetch, setAssigned, addGroup, renameGroup, archiveGroup, reorderGroups, addCategory, renameCategory, archiveCategory, setTarget, removeTarget, setSnooze, moveMoney, applyProposals,
```

- [ ] **Step 4: Create `ReorderGroupsModal.tsx`**

Create `app/src/plan/ReorderGroupsModal.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { ReorderList } from './ReorderList';
import { move } from './reorderMove';
import { Button } from '@/components/ui/button';
import { useBudget } from '../budget/useBudget';
import { useDialogs } from '../components/feedback/DialogProvider';
import { useI18n } from '../i18n/useI18n';

export function ReorderGroupsModal({ onClose }: { onClose: () => void }) {
  const { groups, reorderGroups } = useBudget();
  const { confirm, notify } = useDialogs();
  const { t } = useI18n();

  const initial = useMemo(
    () => groups.filter((g) => !g.isSystem).map((g) => ({ id: g.id, name: g.name })),
    [groups],
  );
  const [ordered, setOrdered] = useState(initial);
  const [saving, setSaving] = useState(false);

  const dirty = ordered.length === initial.length
    && ordered.some((o, i) => o.id !== initial[i]?.id);

  async function close() {
    if (dirty) {
      const ok = await confirm({
        title: t('plan.reorder.discardTitle'),
        description: t('plan.reorder.discardDesc'),
        confirmText: t('plan.delete'),
        destructive: true,
      });
      if (!ok) return;
    }
    onClose();
  }

  async function save() {
    setSaving(true);
    try {
      await reorderGroups(ordered.map((g) => g.id));
      await notify({ title: t('plan.reorder.saved') });
      onClose();
    } catch {
      await notify({ title: t('plan.reorder.saveError') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('plan.reorder.groupsTitle')} onClose={close}>
      <div className="space-y-3">
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('plan.reorder.empty')}</p>
        ) : (
          <ReorderList
            items={ordered}
            onMove={(i, dir) => setOrdered((prev) => move(prev, i, dir))}
            upLabel={(name) => t('plan.reorder.moveUp', { name })}
            downLabel={(name) => t('plan.reorder.moveDown', { name })}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={close}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={!dirty || saving}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Wire the button + modal into `PlanScreen`**

In `app/src/plan/PlanScreen.tsx`:

a) Add the import (after the existing modal imports, around line 11):

```ts
import { ReorderGroupsModal } from './ReorderGroupsModal';
```

b) Extend the `ModalState` union (line 18-23):

```ts
type ModalState =
  | { type: 'assign' }
  | { type: 'move'; fromId: string }
  | { type: 'target'; categoryId: string }
  | { type: 'addCategory' }
  | { type: 'reorderGroups' }
  | null;
```

c) Add a button in the action row (between the existing "+ Category" and "Activity" buttons at line 62-63):

```tsx
<Button variant="outline" size="sm" onClick={() => setModal({ type: 'reorderGroups' })}>{t('plan.reorder.reorderGroups')}</Button>
```

d) Add the conditional render near the other modal renders (after the `addCategory` render at line 75):

```tsx
{modal?.type === 'reorderGroups' && <ReorderGroupsModal onClose={() => setModal(null)} />}
```

- [ ] **Step 6: Run the full suite + build**

Run: `cd app && npm test && npm run build`
Expected: all pass, no TS errors.

- [ ] **Step 7: Manual verification**

```bash
cd app && npm run dev
```

1. New "Sắp xếp nhóm" button visible in the action row (or "Reorder groups" if EN locale).
2. Click it → modal opens listing only non-system groups.
3. First row's `↑` disabled; last row's `↓` disabled.
4. Move a group up → Save button enables → click Save → modal closes, table reflects new order.
5. Reopen modal, move a group, then click Cancel → discard confirm appears; click Cancel on confirm → modal still open; click Delete (confirm) → modal closes, table unchanged.
6. Refresh → new order is persisted.
7. With 0 user groups (or after deleting them all): modal shows empty state, Save disabled.

- [ ] **Step 8: Commit**

```bash
git add app/src/plan/ReorderGroupsModal.tsx app/src/budget/useBudget.tsx app/src/plan/PlanScreen.tsx app/src/i18n/dict.ts
git commit -m "feat(plan): reorder groups modal"
```

---

## Task 5: Category reorder — modal + `reorderCategories` + wiring

**Files:**
- Create: `app/src/plan/ReorderCategoriesModal.tsx`
- Modify: `app/src/budget/useBudget.tsx` (add `reorderCategories` to context)
- Modify: `app/src/plan/PlanScreen.tsx` (button + ModalState + render)

(No new i18n keys — all keys added in Task 4 cover both modals.)

**Interfaces produced:**
- `BudgetCtx.reorderCategories: (groupId: string, orderedIds: string[]) => Promise<void>` — performs one Supabase `upsert` mapping `orderedIds[i]` → `sort_order = i + 1`, then `refetch()`. `groupId` is unused server-side (categories are addressed by id) but is kept in the signature for symmetry and future server-side checks.

**Interfaces consumed:**
- `ReorderList`, `move` from Task 3.
- All `plan.reorder.*` i18n keys from Task 4.

- [ ] **Step 1: Add `reorderCategories` to the `BudgetCtx` interface**

In `app/src/budget/useBudget.tsx`, alongside `reorderGroups` in the `BudgetCtx` interface:

```ts
reorderCategories: (groupId: string, orderedIds: string[]) => Promise<void>;
```

- [ ] **Step 2: Implement `reorderCategories` in `BudgetProvider`**

Add this `useCallback` near the other category methods (after `archiveCategory`, around line 190):

```ts
const reorderCategories = useCallback(async (_groupId: string, orderedIds: string[]) => {
  if (orderedIds.length === 0) return;
  await supabase
    .from('categories')
    .upsert(
      orderedIds.map((id, i) => ({ id, sort_order: i + 1 })),
      { onConflict: 'id' },
    );
  await refetch();
}, [refetch]);
```

Include it in the context value at `app/src/budget/useBudget.tsx:303`:

```ts
refetch, setAssigned, addGroup, renameGroup, archiveGroup, reorderGroups, addCategory, renameCategory, archiveCategory, reorderCategories, setTarget, removeTarget, setSnooze, moveMoney, applyProposals,
```

- [ ] **Step 3: Create `ReorderCategoriesModal.tsx`**

Create `app/src/plan/ReorderCategoriesModal.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { ReorderList } from './ReorderList';
import { move } from './reorderMove';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBudget } from '../budget/useBudget';
import { useDialogs } from '../components/feedback/DialogProvider';
import { useI18n } from '../i18n/useI18n';

export function ReorderCategoriesModal({ onClose }: { onClose: () => void }) {
  const { groups, rows, categoryName, groupIdOf, reorderCategories } = useBudget();
  const { confirm, notify } = useDialogs();
  const { t } = useI18n();

  const userGroups = useMemo(() => groups.filter((g) => !g.isSystem), [groups]);
  const [groupId, setGroupId] = useState(userGroups[0]?.id ?? '');

  const initial = useMemo(() => {
    if (!groupId) return [];
    return rows
      .filter((r) => groupIdOf(r.categoryId) === groupId)
      .map((r) => ({ id: r.categoryId, name: categoryName(r.categoryId) }));
  }, [groupId, rows, groupIdOf, categoryName]);

  const [ordered, setOrdered] = useState(initial);
  const [saving, setSaving] = useState(false);

  const dirty = ordered.length === initial.length
    && ordered.some((o, i) => o.id !== initial[i]?.id);

  async function tryDiscard(): Promise<boolean> {
    if (!dirty) return true;
    return confirm({
      title: t('plan.reorder.discardTitle'),
      description: t('plan.reorder.discardDesc'),
      confirmText: t('plan.delete'),
      destructive: true,
    });
  }

  async function onChangeGroup(next: string) {
    if (next === groupId) return;
    if (!(await tryDiscard())) return;
    setGroupId(next);
    setOrdered(
      rows
        .filter((r) => groupIdOf(r.categoryId) === next)
        .map((r) => ({ id: r.categoryId, name: categoryName(r.categoryId) })),
    );
  }

  async function close() {
    if (!(await tryDiscard())) return;
    onClose();
  }

  async function save() {
    setSaving(true);
    try {
      await reorderCategories(groupId, ordered.map((c) => c.id));
      await notify({ title: t('plan.reorder.saved') });
      onClose();
    } catch {
      await notify({ title: t('plan.reorder.saveError') });
    } finally {
      setSaving(false);
    }
  }

  if (userGroups.length === 0) {
    return (
      <Modal title={t('plan.reorder.categoriesTitle')} onClose={onClose}>
        <p className="text-sm text-muted-foreground">{t('plan.reorder.empty')}</p>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t('plan.reorder.categoriesTitle')} onClose={close}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{t('plan.reorder.groupPicker')}</Label>
          <Select value={groupId} onValueChange={onChangeGroup}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {userGroups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('plan.reorder.empty')}</p>
        ) : (
          <ReorderList
            items={ordered}
            onMove={(i, dir) => setOrdered((prev) => move(prev, i, dir))}
            upLabel={(name) => t('plan.reorder.moveUp', { name })}
            downLabel={(name) => t('plan.reorder.moveDown', { name })}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={close}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={!dirty || saving}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
```

Note: this uses `rows` (the visible `PlanRow[]`) for the category list rather than `raw.categories` directly, so it stays consistent with what the user sees in the Plan table. `rows` is filtered to the current month but every active category appears in it regardless of filter state.

- [ ] **Step 4: Wire the button + modal into `PlanScreen`**

In `app/src/plan/PlanScreen.tsx`:

a) Add the import:

```ts
import { ReorderCategoriesModal } from './ReorderCategoriesModal';
```

b) Extend the `ModalState` union:

```ts
type ModalState =
  | { type: 'assign' }
  | { type: 'move'; fromId: string }
  | { type: 'target'; categoryId: string }
  | { type: 'addCategory' }
  | { type: 'reorderGroups' }
  | { type: 'reorderCategories' }
  | null;
```

c) Add the button immediately after the "Reorder groups" button from Task 4:

```tsx
<Button variant="outline" size="sm" onClick={() => setModal({ type: 'reorderCategories' })}>{t('plan.reorder.reorderCategories')}</Button>
```

d) Add the conditional render after the `reorderGroups` render:

```tsx
{modal?.type === 'reorderCategories' && <ReorderCategoriesModal onClose={() => setModal(null)} />}
```

- [ ] **Step 5: Run the full suite + build**

Run: `cd app && npm test && npm run build`
Expected: all pass, no TS errors.

- [ ] **Step 6: Manual verification**

```bash
cd app && npm run dev
```

Walk through the **full** manual verification checklist from the spec (`docs/superpowers/specs/2026-06-29-reorder-groups-categories-design.md` § Manual verification checklist):

1. Create a new group → appears at the bottom of the table. ✓ (already verified in Task 2)
2. Create a new category → appears at the bottom of its group. ✓ (already verified in Task 2)
3. Reorder Groups modal: move a group up, Save → table reflects new order; refresh confirms persistence. ✓ (already verified in Task 4)
4. **Reorder Categories modal:** switch groups via the picker → list updates; reorder within a group, Save → table reflects new order.
5. **Cancel with pending changes** in either modal → discard confirm fires; confirming dismiss → no DB write (verify in Network tab).
6. **Switching the group picker** with pending changes → discard confirm fires; pressing Cancel keeps the current group/edits.
7. **First row's ↑ is disabled; last row's ↓ is disabled** in both modals.
8. **Empty group** in Category modal → shows "Nothing to reorder", Save disabled.
9. **Two browser tabs** of the same budget: reorder in tab A → tab B reflects within ~1 s (realtime).
10. **Mobile viewport** (DevTools device toolbar): up/down buttons are tap-friendly; modal layout works at narrow widths.
11. **Vietnamese locale:** every new string renders in Vietnamese, no English leaks.

- [ ] **Step 7: Commit**

```bash
git add app/src/plan/ReorderCategoriesModal.tsx app/src/budget/useBudget.tsx app/src/plan/PlanScreen.tsx
git commit -m "feat(plan): reorder categories modal"
```

---

## Self-review

**Spec coverage:**
- §Goal (manual reorder + auto-bottom for new items) → Tasks 2, 4, 5 (auto-bottom) + 4, 5 (manual reorder modals).
- §Architecture/Data model (no migration, use existing `sort_order`) → Task 1 wires the column through the type layer; no migration touched.
- §New files → All four created in Tasks 3-5; the spec's `reorderMove.ts` is in Task 3.
- §Modified files → `PlanScreen.tsx` (Tasks 4, 5), `useBudget.tsx` (Tasks 1, 2, 4, 5), `mappers.ts` (Task 1), `i18n/dict.ts` (Task 4).
- §No changes to `migrations`, `useRealtime`, `CategoryTable` → respected. Realtime is exercised by the manual verification step "two browser tabs".
- §`ReorderList` props → Task 3 matches the spec's prop names (`items`, `onMove`), plus `upLabel`/`downLabel` for i18n. Documented in Task 3's Interfaces produced.
- §`ReorderGroupsModal` + `ReorderCategoriesModal` behaviors (snapshot, dirty check, discard confirm, empty state, save toast) → Tasks 4 and 5.
- §Edge cases (0 user groups, 1 group, archived during edit, save fail) → Task 5 special-cases the 0-groups state; the 1-group case is handled by `ReorderList`'s disabled-edge logic (covered by Task 3 tests).
- §Accessibility (real `aria-label`s, disabled attribute) → Task 3 implementation + tests.
- §Testing → Task 1 (`nextSortOrder.test.ts`), Task 3 (`reorderMove.test.ts`, `ReorderList.test.tsx`).
- §Implementation order → matches: mapper/insert (Tasks 1, 2), `ReorderList` (Task 3), Group reorder (Task 4), Category reorder (Task 5).

**Note on a divergence from the spec:** The spec mentions a `sonner` toast for save success/failure, but the existing codebase has `sonner` set up only as a `Toaster` component (no `toast()` calls anywhere). The plan instead uses `notify()` from the existing `useDialogs` hook, which is the established pattern (used in `LedgerScreen`, etc.). This is a faithful intent-preserving adaptation rather than a behavior change. If the spec must be followed literally, swap `notify` for `import { toast } from 'sonner'` in Tasks 4 and 5.

**Placeholder scan:** No TBD / TODO / "implement later" / "add appropriate" entries in any step. Every code block is the actual code to write.

**Type consistency:**
- `nextSortOrder` signature: defined in Task 1, used in Task 2. Same `<T extends { sortOrder: number }>` shape.
- `BudgetCtx['groups']` element shape gains `sortOrder: number` in Task 1; consumed (without breakage) in Task 4 (`ReorderGroupsModal` reads `id`, `name`, `isSystem`; `sortOrder` is unused there but present in the type).
- `reorderGroups` / `reorderCategories` signatures: defined in Tasks 4 / 5, no later consumer redefines them.
- `ReorderListProps`: defined in Task 3, consumed identically in Tasks 4 and 5.

No issues found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-reorder-groups-categories.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
