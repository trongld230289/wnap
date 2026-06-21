# WNAP In-App User Guide — Design

**Date:** 2026-06-21
**Status:** Approved (awaiting implementation plan)
**Author:** brainstormed with Claude

## Goal

Add a discoverable, in-app user guide that helps Vietnamese users learn WNAP's main functions and walks them through common use cases step by step. The guide should be reachable from the global header (icon button placed immediately before the language switcher) and open as a modal with two sections: an overview mindmap of main functions and a sidebar-driven list of use case walkthroughs.

Content is sourced from the project's knowledge base (`wnap/knowledge-based/ynap-all-use-case.md` and related files) plus features surfaced by a code-vs-knowledge-base gap analysis (Snooze, Move Money, Invite member, Filter cards).

## Non-goals

- Not a help-desk or FAQ system. No search, no contact form, no ticket flow.
- Not a tutorial/onboarding tour. No spotlight overlays or step-trigger automation across the live UI.
- Not a CMS. Content is shipped statically with the app (in dict files), not fetched.
- Not bookmarkable. The guide is modal-only; we do not add a `/guide` route.

## Architecture

### New files

```
app/src/guide/
  GuideButton.tsx          # Header icon button; lazy-loads & opens the modal
  GuideModal.tsx           # Radix Dialog wrapper; lazy chunk entry point
  GuideSidebar.tsx         # Left rail with collapsible phase groups
  GuideContent.tsx         # Right pane; switches on selected sidebar item
  OverviewMindmap.tsx      # Mermaid mindmap of main functions
  useCases.ts              # Data: array of UseCase records
  mainFunctions.ts         # Data: Mermaid source string + node→useCaseId map
  guideDict.ts             # i18n strings for everything inside the modal
  useGuideI18n.ts          # Hook: same shape as useI18n, reads guideDict
```

### Wiring point

`app/src/App.tsx` (or whichever component currently renders the header — confirm during implementation). Insert `<GuideButton />` immediately before `<LangSwitch />` in the header's right-aligned action cluster:

```tsx
<div className="flex items-center gap-2">
  <GuideButton />        {/* new */}
  <LangSwitch />
  <UserMenu />
</div>
```

### Dependencies

All already present in `app/package.json`:

- `radix-ui` — Dialog primitive
- `lucide-react` — `BookOpen`, `ChevronRight`, `ChevronDown` icons
- `tailwindcss` — styling
- Existing `useI18n` hook — re-used by `useGuideI18n` for the language state

### New dependency

- `mermaid` (~280 KB minified) — added to `dependencies`. Dynamically imported inside `OverviewMindmap.tsx` so it does not enter the main bundle.

### Bundle strategy

- **Main bundle:** only `GuideButton.tsx` + the single i18n key `guide.button.tooltip`. ~1 KB.
- **Lazy guide chunk:** triggered when the user first clicks the button. Contains `GuideModal` and everything it imports (Mermaid, `guideDict`, use cases data, components). ~300 KB.
- Vite handles this automatically via dynamic `import()`.

## UI Layout

### Header button

- Component: `<button>` with `lucide-react` `BookOpen` icon.
- Size & style: `size="icon"` ghost, matches existing `LangSwitch` and user menu trigger.
- Tooltip on hover: `t('guide.button.tooltip')` → `'Hướng dẫn sử dụng'` / `'User guide'`.
- Click: lazy-imports `GuideModal` and opens it.

### Modal frame

- Radix `Dialog`.
- Width: `90vw`, capped at `1100px`.
- Height: viewport height minus `8vh` top/bottom margin; `overflow: hidden` on the frame, child panes scroll independently.
- Title bar: `📖` + `t('guide.modal.title')` + radix close button (`X`).
- Body: CSS grid `grid-cols-[260px_1fr]` on `sm:` and up; single column on mobile.

### Sidebar (260 px, scrollable)

Items render in this fixed order:

1. **`🗺️ Tổng quan`** — always at top; selected by default on first open; shows the mindmap.
2. **Phase headers** — collapsible (`<details>` or controlled `useState`), expanded by default:
   - Giai đoạn 1: Thiết lập — `design-categories`, `connect-accounts`
   - Giai đoạn 2: Phân bổ — `payday-assign`, `auto-assign`
   - Giai đoạn 3: Hoạt động hàng ngày — `record-transaction`, `overspend-roll`
   - Giai đoạn 4: Bảo trì — `reconcile`
   - Giai đoạn 5: Đồng bộ gia đình — `use-together`, `check-wallet`
   - Tính năng bổ sung — `snooze-target`, `move-money`, `invite-member`, `filter-cards`
3. Selected item: `bg-muted font-semibold`. Hover: `bg-muted/50`.

### Content pane (flex-1, scrollable)

- For `Tổng quan`: renders `<OverviewMindmap />`, centered, `max-w-full`.
- For a use case, renders in this order:
  1. `<h2>` title — `t(uc.titleKey)`
  2. **`Các bước`** label + ordered list — each item is `t(uc.steps[i])`
  3. **`Ví dụ`** callout (muted background, rounded, padded) — `t(uc.example)`
  4. **`💡 Mẹo`** callout (amber-50 background) + bullet list — each item is `t(uc.tips[i])`
  5. Optional `<img>` if `uc.refImage` is set, captioned and lazy-loaded

### Mobile (< 640 px)

- Sidebar collapses into a `<select>`-style dropdown above the content pane.
- Content takes full width.
- Mindmap is still rendered but scrollable horizontally if it overflows.

## Overview Mindmap

### Structure

Root has 3 branches — the user's mental model of the app:

```
mindmap
  root((📊 WNAP))
    🎯 Lập kế hoạch
      Danh mục & Nhóm
      Sẵn sàng phân bổ
      Mục tiêu
        Để dành
        Đắp đầy
        Có đủ trước hạn
      Auto-Assign
      Move Money
      Snooze
      Bộ lọc trạng thái
    📓 Sổ giao dịch
      Tài khoản
      Giao dịch
        Chi tiêu
        Thu nhập
        Chuyển khoản
      Đối soát
    👨‍👩‍👧 Gia đình
      Mời thành viên
      Cùng quản lý ngân sách
```

### Interactivity

Each leaf node has a `click` handler attached via Mermaid's `click <id> call <fn>` directive. Clicking a leaf navigates the sidebar to the corresponding use case id (map kept in `mainFunctions.ts`: `{ 'Move Money': 'move-money', 'Đối soát': 'reconcile', ... }`).

Leaves without a matching use case (e.g. "Sẵn sàng phân bổ", which is a state not an action) are non-clickable and rendered in muted color.

### Theming

- Light mode: default Mermaid theme.
- Dark mode: Mermaid `theme: 'dark'`, configured in the dynamic init call.
- Theme is read from `next-themes` (already in project deps).

## Use Cases (Section 2)

Total: 13 cases. Each is stored in `useCases.ts` as a typed record.

### Data shape

```ts
export type Phase = 'setup' | 'assign' | 'daily' | 'maint' | 'family' | 'extras';

export type UseCase = {
  id: string;             // url-safe id; also used as sidebar key
  phase: Phase;
  titleKey: string;       // i18n key in guideDict
  stepKeys: string[];     // i18n keys; render as numbered list
  exampleKey: string;     // i18n key; renders as muted callout
  tipKeys: string[];      // i18n keys; render as amber-callout bullets
  refImage?: string;      // optional repo-root-relative path to a screenshot
};
```

### Listing

| # | Phase | id | Vietnamese title (source) |
|---|-------|-----|---------------------------|
| 1 | setup | `design-categories` | Thiết kế danh mục & nhóm |
| 2 | setup | `connect-accounts` | Tạo và kết nối tài khoản |
| 3 | assign | `payday-assign` | Ngày lương — Phân bổ mỗi đồng (Rule 1) |
| 4 | assign | `auto-assign` | Dùng Auto-Assign để phân bổ nhanh |
| 5 | daily | `record-transaction` | Ghi nhận giao dịch hàng ngày |
| 6 | daily | `overspend-roll` | Khi vượt chi — Roll With The Punches (Rule 3) |
| 7 | maint | `reconcile` | Đối soát số dư với ngân hàng |
| 8 | family | `use-together` | Sử dụng WNAP cùng gia đình |
| 9 | family | `check-wallet` | Kiểm tra "ví" trước khi tiêu |
| 10 | extras | `snooze-target` | Tạm hoãn mục tiêu (Snooze) |
| 11 | extras | `move-money` | Chuyển tiền giữa các danh mục (Move Money) |
| 12 | extras | `invite-member` | Mời thành viên gia đình bằng invite code |
| 13 | extras | `filter-cards` | Đọc 5 thẻ bộ lọc trạng thái |

Cases 1–9 are adapted from `wnap/knowledge-based/ynap-all-use-case.md` (Situations 1–9). Cases 10–13 come from the gap analysis between the codebase and the knowledge base, covering implemented features the documentation does not yet explain.

### Example — fully specified case (`payday-assign`)

- **Steps (5):** Mở Plan tab → Kiểm tra Sẵn sàng phân bổ (RTA) > 0 → Click "+ Phân bổ" → Chọn category → Nhập số tiền → Lặp lại đến khi RTA = 0₫
- **Example:** "Lương 20 triệu về tài khoản. RTA hiển thị 20.000.000₫. Phân bổ 5tr cho 'Tiền nhà', 3tr cho 'Ăn uống', 2tr 'Đi lại'… cho đến khi RTA về 0."
- **Tips:** "Bắt đầu từ chi phí bắt buộc (Bills) trước, sau đó Needs, cuối cùng Wants" / "Nếu lúng túng, dùng Auto-Assign → Underfunded để phân bổ tự động dựa trên Targets"

### Screenshots

Four screenshots at repo root will be referenced by `refImage` on the matching cases:

- `Plan_overview.png` → `payday-assign`
- `Plan_clickACategory.png` → `move-money`
- `Targer-details.png` → `auto-assign`, `snooze-target`
- `AddTransaction.png` → `record-transaction`

Implementation will copy these into `app/public/guide/` so Vite serves them.

## i18n

### Two-file strategy

- **`app/src/i18n/dict.ts`** — adds only `guide.button.tooltip` (1 key per language). Needed before the modal lazy-loads so the button tooltip is available.
- **`app/src/guide/guideDict.ts`** — all other guide strings. Same shape as `dict.ts` (`{ vi: {...}, en: {...} }`). Lives in the lazy chunk.

### Hook

```ts
// useGuideI18n.ts
import { useI18n } from '../i18n/useI18n';
import { guideDict } from './guideDict';

export function useGuideI18n() {
  const { lang } = useI18n();
  return (key: string) => guideDict[lang]?.[key] ?? key;
}
```

The hook is only callable from inside components that live in the guide chunk, so `guideDict` is never loaded by the main bundle.

### Key naming convention (flat, dot-separated)

```
guide.modal.title
guide.sidebar.overview
guide.sidebar.extras
guide.phase.setup .. guide.phase.family
guide.mm.<label>            # mindmap node labels (~15 keys)
guide.uc.<id>.title         # use case strings (~9 keys per case × 13 cases)
guide.uc.<id>.step.1 .. step.N
guide.uc.<id>.example
guide.uc.<id>.tip.1 .. tip.N
```

Total: ~260 keys (~130 per language).

## Testing

| Layer | What to verify | Tool | New file |
|-------|----------------|------|----------|
| Unit | Every `titleKey`, `stepKeys[i]`, `exampleKey`, `tipKeys[i]` in `useCases.ts` resolves in both `vi` and `en` (no missing/orphaned keys) | Vitest | `useCases.test.ts` |
| Unit | `mainFunctions.ts` Mermaid source contains every label that is also keyed in `guideDict.mm.*` | Vitest | `mainFunctions.test.ts` |
| Component | `GuideModal` mounts; clicking a sidebar item swaps content; mobile breakpoint renders dropdown instead of sidebar | @testing-library/react + jsdom (already installed) | `GuideModal.test.tsx` |
| Manual E2E | Open modal from header → click 3 sidebar items → click 1 mindmap leaf → close | Playwright MCP | Run after implementation, document in commit body |

Bundle-size check: `vite build` output prints chunk sizes — confirm the main `index-*.js` chunk does not grow by more than ~2 KB and that there is a new `guide-*.js` chunk in the ~300 KB range.

## Open questions for implementation

None blocking. The following are deferred to the implementation plan, not blockers for design approval:

- Exact path of the header file in `App.tsx` vs a separate `Header.tsx` (needs a quick grep during planning).
- Whether the sidebar phase headers use native `<details>` or a controlled accordion — pick whichever matches existing patterns in the codebase.
- Whether to ship the 4 screenshots at full size or pre-resize to ~800 px wide for the lazy chunk.

## Rollout

- Single PR, single commit on `main` (no feature flag — guide is opt-in by nature).
- Manual verification via Playwright MCP before push.
- No DB / Supabase changes required.
