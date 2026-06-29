# Reorder Groups & Categories — Design

**Date:** 2026-06-29
**Status:** Awaiting user review
**Author:** brainstormed with Claude

## Goal

Let the user control the display order of category groups and of categories within a group on the Plan screen. Two paths to ordering:

1. **Automatic** — newly created groups and categories land at the bottom of their list. This covers the common case (the user just added something and wants it last) without any extra interaction.
2. **Manual** — two modals (one for groups, one for categories) with up/down arrow buttons and an explicit Save button. Used for the rare case of changing an existing order.

The chosen interaction is **up/down arrow buttons inside a modal**, not drag-and-drop. Reason: it is the simplest path that works equally well on desktop, mobile (touch), and keyboard, requires zero new dependencies, and the user expects to reorder long lists rarely.

## Non-goals

- No drag-and-drop. No `@dnd-kit`, no `react-dnd`, no native HTML5 drag handlers.
- No inline reorder mode in the table (the table remains the same).
- No reordering of the system "Inflow: Ready to Assign" group — it is filtered out of the reorder UI and stays pinned at `sort_order = 999`.
- No new Postgres RPCs. Reorder writes go through `upsert` against the existing tables.
- No reorder action-log entries (reorders are presentation-only and not worth logging).

## Architecture

### Data model — no migration

Both tables already carry the column:

- `category_groups.sort_order int not null default 0` (`supabase/migrations/0001_schema.sql:39`)
- `categories.sort_order int not null default 0` (`supabase/migrations/0001_schema.sql:48`)

The current fetch already orders by it (`app/src/budget/useBudget.tsx:83-84`), so reads need no changes once the column is populated correctly.

### New files

```
app/src/plan/
  reorderMove.ts                        # Pure `move(list, index, dir)` helper — swap two adjacent items
  ReorderList.tsx                       # Shared list with ↑ / ↓ per row + disabled-edge logic
  ReorderGroupsModal.tsx                # Dialog over ReorderList, scoped to non-system groups
  ReorderCategoriesModal.tsx            # Dialog over ReorderList, with group <Select> picker
  __tests__/reorderMove.test.ts         # Unit tests for the move helper
  __tests__/ReorderList.test.tsx        # Unit tests for disabled-edge rendering
```

### Modified files

- `app/src/plan/PlanScreen.tsx`
  - Add two buttons to the existing action row (`PlanScreen.tsx:60-64`): `Reorder Groups`, `Reorder Categories`.
  - Extend the `ModalState` union with `{ type: 'reorderGroups' }` and `{ type: 'reorderCategories' }`.
  - Render the two new modals conditionally, mirroring the existing modal pattern.

- `app/src/budget/useBudget.tsx`
  - Expose `sortOrder` on the mapped `groups` array and on whatever shape `useBudget` returns for categories. (Required by the insert path to compute `max + 1`.)
  - `addGroup(name)`: compute `next = (max sort_order among non-system groups) + 1`, insert with that value.
  - `addCategory(groupId, name, kind)`: compute `next = (max sort_order among categories in groupId) + 1`, insert with that value.
  - Add two new context methods:
    - `reorderGroups(orderedIds: string[]) => Promise<void>`
    - `reorderCategories(groupId: string, orderedIds: string[]) => Promise<void>`
  - Each does a single `upsert` of `{ id, sort_order }` pairs, then `refetch()`.

- `app/src/lib/mappers.ts` — extend the group / category mapper outputs to include `sortOrder` if not already exposed.

- `app/src/i18n/dict.ts` — new keys under `plan.reorder.*`, English + Vietnamese:
  - `reorderGroups` ("Reorder groups" / "Sắp xếp nhóm")
  - `reorderCategories` ("Reorder categories" / "Sắp xếp danh mục")
  - `groupsTitle`, `categoriesTitle`
  - `groupPicker` (label for the group `<Select>` in the category modal)
  - `empty` ("Nothing to reorder")
  - `moveUp` ("Move {name} up") / `moveDown` ("Move {name} down") — used as `aria-label`s
  - `discardTitle`, `discardDesc` (unsaved-changes confirm)
  - `saved` (success toast), `saveError` (failure toast)
  - `save`, `cancel`

### No changes to

- `supabase/migrations/*` — schema and RLS already cover this.
- `app/src/budget/useRealtime.ts` — existing UPDATE subscription will pick up reorder writes and trigger refetch in other tabs / for other members.
- `app/src/plan/CategoryTable.tsx` — it already iterates `groups` in the order returned by `useBudget`, which is `sort_order` ASC.

## Components

### `ReorderList` — shared

Props:

```ts
interface ReorderListProps {
  items: Array<{ id: string; name: string }>;
  onMove: (fromIndex: number, direction: -1 | 1) => void;
}
```

Renders a vertical list. Each row: name on the left, two icon buttons `↑` and `↓` on the right. The first row's `↑` is `disabled`; the last row's `↓` is `disabled`. The component holds no state — the parent owns the list and the swap.

The swap helper lives in `reorderMove.ts`, imported by both modals:

```ts
export function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}
```

### `ReorderGroupsModal`

- On open: snapshot `groups.filter(g => !g.isSystem)` into local state `ordered`.
- Empty state if `ordered.length === 0`: show `t('plan.reorder.empty')` and only a `Cancel` button.
- Body: `<ReorderList items={ordered} onMove={...} />`.
- Footer: `Cancel` · `Save`. `Save` is disabled until the list differs from the snapshot.
- `Save`: call `reorderGroups(ordered.map(g => g.id))`, show success toast, close.
- `Cancel` / ESC / backdrop close: if the list differs from the snapshot, show a confirm dialog (`t('plan.reorder.discardTitle')`). Otherwise close immediately.

### `ReorderCategoriesModal`

- On open: pick the first non-system group as the default selection, snapshot its categories.
- Body:
  - A `<Select>` of non-system groups at the top, with `t('plan.reorder.groupPicker')` as its label.
  - Below it, `<ReorderList items={ordered} onMove={...} />`.
- Empty state if the selected group has 0 categories: show `t('plan.reorder.empty')` in place of the list. `Save` stays disabled.
- Footer: `Cancel` · `Save`. `Save` disabled until the list differs from the original.
- Changing the group picker while there are unsaved changes triggers the same discard confirm.
- `Save`: call `reorderCategories(selectedGroupId, ordered.map(c => c.id))`, success toast, close.

## Data flow

```
User clicks ↑/↓
    → parent setState swaps two ids in local array
        → ReorderList re-renders with new order
            → user clicks Save
                → useBudget.reorderGroups / reorderCategories
                    → supabase.from(...).upsert(items.map((x, i) => ({ id: x.id, sort_order: i + 1 })), { onConflict: 'id' })
                        → refetch()
                            → realtime UPDATE event fires for other tabs / members
                                → their useRealtime triggers refetch()
```

Persistence is a single network call per Save. Saved values are `1..N` (we start at 1, not 0, to leave the default at the bottom of the order space). The system group's `999` keeps it last.

## Edge cases

| Case | Behavior |
|---|---|
| 0 user groups | Reorder Groups button stays enabled; modal shows empty state. Reorder Categories modal also shows the empty state (no groups means no categories to reorder). |
| 1 user group | Modal opens; both ↑ and ↓ are disabled. Save is a no-op (disabled). |
| Group with 0 categories | Category modal shows empty state for that selection. User can switch to another group. |
| Concurrent edit by another member | Last-write-wins per save. Whole-list write avoids partial corruption. Realtime refreshes both views. |
| Realtime UPDATE while modal is open | Modal local state is a snapshot; we ignore live changes until Save or Cancel. Documented trade-off, not a bug. |
| Concurrent add (two members both `addGroup` at the same instant) | Both clients compute the same `max + 1`, producing two rows tied at the same `sort_order`. Tie is resolvable via the reorder modal. |
| Item archived elsewhere while modal is open | Save still writes `id` + `sort_order` for the archived row; archived rows are filtered from the visible UI by `useBudget`'s `.eq('archived', false)` query, so the stale write has no visible effect. |
| Save fails (network/RLS) | Modal stays open; show a `sonner` error toast. Do not close. |
| Save succeeds | Close modal; show success toast. |

## Accessibility

- Each ↑ / ↓ button is a real `<button>` with `aria-label={t('plan.reorder.moveUp', { name }) }` etc.
- Disabled state via the standard `disabled` attribute (not just visual).
- Modal uses the existing Radix Dialog primitive; focus trap and ESC handling come from there for free.
- Keyboard support is implicit (Tab to the row's button, Enter / Space to activate). No custom key handling needed.

## Internationalization

All new strings flow through `t(...)`. English and Vietnamese must both be added under `plan.reorder.*` in `app/src/i18n/dict.ts` at the same time.

## Testing

- **Unit (`reorderMove.test.ts`)** — pure helper:
  - Move-up at index 0 returns the list unchanged.
  - Move-down at last index returns the list unchanged.
  - Move-down at index `i` swaps with `i + 1` (assert by ids).
  - Single-item list: both directions are no-ops.
- **Unit (`ReorderList.test.tsx`)** — rendering:
  - First row's ↑ button has `disabled` attribute; last row's ↓ button has `disabled` attribute.
  - `onMove(index, dir)` is invoked with the right arguments when a button is clicked.
  - Single-item list: both buttons disabled.
- **Existing tests**: extend `mappers.test.ts` if mapper output shape gains `sortOrder`.
- **No DB tests needed** — the write path is a single Supabase `upsert` of an existing table; RLS already covers it.

## Manual verification checklist

Before declaring done, walk through:

- [ ] Create a new group → appears at the bottom of the table.
- [ ] Create a new category → appears at the bottom of its group.
- [ ] Reorder Groups modal: move a group up, Save → table reflects new order; refresh confirms persistence.
- [ ] Reorder Categories modal: switch groups via the picker → list updates; reorder within a group, Save → table reflects new order.
- [ ] Cancel with pending changes → discard confirm fires; confirming dismiss → no DB write (verify in Network tab).
- [ ] First row's ↑ is disabled; last row's ↓ is disabled.
- [ ] Empty group in Category modal → shows empty state, Save disabled.
- [ ] Two browser tabs of the same budget: reorder in tab A → tab B reflects within a couple seconds (realtime).
- [ ] Mobile viewport (or real device): up/down buttons are tap-friendly; modal layout works at narrow widths.
- [ ] Vietnamese locale: every new string renders in Vietnamese, no English leaks.

## Implementation order

Each slice is independently shippable and ends with a green build:

1. **Mapper + insert defaults** — expose `sortOrder`, fix `addGroup` / `addCategory` to use `max + 1`. The most-valuable behavior change ships first, before any new UI.
2. **`ReorderList` + tests** — pure component, no integration.
3. **Group reorder** — `ReorderGroupsModal`, `reorderGroups`, button + i18n.
4. **Category reorder** — `ReorderCategoriesModal`, `reorderCategories`, button + i18n.

## Risks & trade-offs

- **Tied `sort_order` from concurrent inserts.** Two members each computing `max + 1` from the same snapshot will tie. Acceptable — easy to resolve via the reorder modal. Not worth a per-budget mutex or a server-side `max` computation.
- **Stale snapshot inside an open modal.** If a teammate adds/removes/reorders while the user's modal is open, the user's Save will overwrite. Mitigation deferred until reported as a real problem; the conflict surface is small.
- **Up/down clicks on long lists.** Reordering item #20 to position #1 takes 19 clicks. We accepted this for simplicity; the user has stated reorder is rare and mostly used after creating a single new item.
