# WNAP In-App User Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app user guide reachable from the header (icon button placed immediately before `<LangSwitch />`) that opens a modal with a Mermaid mindmap overview of WNAP's main functions and a sidebar-driven list of 13 use case walkthroughs in both Vietnamese and English.

**Architecture:** New self-contained `app/src/guide/` module. Header gets a 1KB `GuideButton` that dynamically imports `GuideModal` and everything underneath it (Mermaid ~280KB, guide dictionary ~15KB, components ~5KB) so the main bundle stays small. Use cases are typed records pointing at i18n keys in a parallel `guideDict.ts`; a thin `useGuideI18n` hook resolves them using the same `Lang` state as the rest of the app.

**Tech Stack:**
- React 19, TypeScript (strict), Vite, Tailwind, Radix UI Dialog, lucide-react, next-themes — all already in `app/package.json`
- Mermaid (new dep, `^11.4.0`)
- Vitest + jsdom + @testing-library/react (jsdom + RTL already installed in last commit `39ac266`, but vitest jsdom env not yet configured)

## Global Constraints

- Vietnamese is the source language; every guide string MUST exist in both `guideDict.vi` and `guideDict.en`. The data integrity test in Task 2 fails the build if any key is missing in either language.
- Path alias `@/` resolves to `app/src/` (configured in `vite.config.ts`). Use it for cross-folder imports.
- Existing `useI18n` returns `{ lang, setLang, t }`; `Lang = 'vi' | 'en'` exported from `app/src/i18n/dict.ts`. Read `lang` from `useI18n` — do NOT add a second language state.
- Main bundle MUST NOT include `mermaid` or `guideDict`. Verify by inspecting `npm run build` output after Task 9: a `guide-*.js` chunk in the ~300KB range must appear, separate from `index-*.js`.
- All component tests must run under `vitest` with `environment: 'jsdom'`. Plain logic tests (no React) use the default node env.
- New i18n keys outside the guide module use the existing typed `TKey` system in `dict.ts` (`guide.button.tooltip` only). All other guide strings live in `guideDict.ts` with a parallel `GuideTKey` type.
- Use Vietnamese verbatim from `wnap/knowledge-based/ynap-all-use-case.md` for cases 1-9 (translated/adapted, not copy-paste); cases 10-13 are written fresh by the implementer following the same tone.
- Single PR, push to `main` after Task 11.

---

### Task 1: Install Mermaid, configure Vitest jsdom env, scaffold guide folder

**Files:**
- Modify: `app/package.json` (add `mermaid` to dependencies)
- Modify: `app/vite.config.ts` (add `test` block + reference setup file)
- Create: `app/vitest.setup.ts`
- Create: `app/src/guide/index.ts`

**Interfaces:**
- Consumes: nothing from later tasks
- Produces: working vitest jsdom env for all later component tests; `app/src/guide/` exists

- [ ] **Step 1: Install Mermaid**

Run from `app/`:
```bash
npm install mermaid@^11.4.0
```

Expected: `package.json` gains `"mermaid": "^11.4.0"` under `dependencies`; lockfile updates.

- [ ] **Step 2: Create vitest setup file**

Create `app/vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

If `@testing-library/jest-dom` is not yet a dep, install it too:
```bash
npm install -D @testing-library/jest-dom@^6
```

- [ ] **Step 3: Add vitest config to vite.config.ts**

Edit `app/vite.config.ts`. The existing `defineConfig({ plugins: [...], resolve: {...} })` becomes:
```ts
export default defineConfig({
  plugins: [...],
  resolve: {...},
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

You also need the triple-slash reference at the top so TS picks up vitest globals:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
```

- [ ] **Step 4: Verify existing tests still pass**

Run from `app/`:
```bash
npm run test
```

Expected: all currently-existing tests (ledger, engine, budget) pass. They use `import { expect, test } from 'vitest'` so the `globals: true` flag doesn't break them.

- [ ] **Step 5: Create empty guide index**

Create `app/src/guide/index.ts`:
```ts
export {};
```

- [ ] **Step 6: Verify build still works**

Run from `app/`:
```bash
npm run build
```

Expected: build succeeds with no new errors. Note the size of `dist/assets/index-*.js` — record this number for comparison after Task 9.

- [ ] **Step 7: Commit**

```bash
git add app/package.json app/package-lock.json app/vite.config.ts app/vitest.setup.ts app/src/guide/index.ts
git commit -m "chore(guide): scaffold guide module + configure vitest jsdom env"
```

---

### Task 2: Define `UseCase` type + register all 13 use cases (keys only)

**Files:**
- Create: `app/src/guide/useCases.ts`
- Create: `app/src/guide/__tests__/useCases.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export type Phase = 'setup' | 'assign' | 'daily' | 'maint' | 'family' | 'extras';
  export type UseCase = {
    id: string;
    phase: Phase;
    titleKey: string;
    stepKeys: string[];
    exampleKey: string;
    tipKeys: string[];
    refImage?: string;
  };
  export const USE_CASES: readonly UseCase[];
  export const PHASES: readonly Phase[];
  ```

- [ ] **Step 1: Write the failing test**

Create `app/src/guide/__tests__/useCases.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { USE_CASES, PHASES } from '../useCases';

describe('USE_CASES', () => {
  test('has exactly 13 entries', () => {
    expect(USE_CASES).toHaveLength(13);
  });

  test('every id is unique', () => {
    const ids = USE_CASES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every phase is a known phase', () => {
    for (const u of USE_CASES) {
      expect(PHASES).toContain(u.phase);
    }
  });

  test('every record has non-empty title, steps, example, tips', () => {
    for (const u of USE_CASES) {
      expect(u.titleKey).toMatch(/^guide\.uc\./);
      expect(u.exampleKey).toMatch(/^guide\.uc\./);
      expect(u.stepKeys.length).toBeGreaterThan(0);
      expect(u.tipKeys.length).toBeGreaterThan(0);
    }
  });

  test('id appears in titleKey, stepKeys and tipKeys', () => {
    for (const u of USE_CASES) {
      expect(u.titleKey).toBe(`guide.uc.${u.id}.title`);
      expect(u.exampleKey).toBe(`guide.uc.${u.id}.example`);
      u.stepKeys.forEach((k, i) => expect(k).toBe(`guide.uc.${u.id}.step.${i + 1}`));
      u.tipKeys.forEach((k, i) => expect(k).toBe(`guide.uc.${u.id}.tip.${i + 1}`));
    }
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- useCases
```

Expected: FAIL with "Cannot find module '../useCases'".

- [ ] **Step 3: Implement `useCases.ts`**

Create `app/src/guide/useCases.ts`. Each record gets a `stepKeys`/`tipKeys` length matching what the spec implies (rough estimates below; tweak when authoring content in Task 10):

```ts
export type Phase = 'setup' | 'assign' | 'daily' | 'maint' | 'family' | 'extras';

export type UseCase = {
  id: string;
  phase: Phase;
  titleKey: string;
  stepKeys: string[];
  exampleKey: string;
  tipKeys: string[];
  refImage?: string;
};

export const PHASES: readonly Phase[] = ['setup', 'assign', 'daily', 'maint', 'family', 'extras'] as const;

const uc = (id: string, phase: Phase, nSteps: number, nTips: number, refImage?: string): UseCase => ({
  id,
  phase,
  titleKey: `guide.uc.${id}.title`,
  exampleKey: `guide.uc.${id}.example`,
  stepKeys: Array.from({ length: nSteps }, (_, i) => `guide.uc.${id}.step.${i + 1}`),
  tipKeys: Array.from({ length: nTips }, (_, i) => `guide.uc.${id}.tip.${i + 1}`),
  ...(refImage ? { refImage } : {}),
});

export const USE_CASES: readonly UseCase[] = [
  uc('design-categories',    'setup',  5, 2),
  uc('connect-accounts',     'setup',  4, 2),
  uc('payday-assign',        'assign', 5, 2, '/guide/Plan_overview.png'),
  uc('auto-assign',          'assign', 4, 2, '/guide/Targer-details.png'),
  uc('record-transaction',   'daily',  5, 2, '/guide/AddTransaction.png'),
  uc('overspend-roll',       'daily',  4, 2),
  uc('reconcile',            'maint',  5, 2),
  uc('use-together',         'family', 4, 2),
  uc('check-wallet',         'family', 3, 1),
  uc('snooze-target',        'extras', 4, 1, '/guide/Targer-details.png'),
  uc('move-money',           'extras', 4, 1, '/guide/Plan_clickACategory.png'),
  uc('invite-member',        'extras', 4, 2),
  uc('filter-cards',         'extras', 5, 2),
];
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- useCases
```

Expected: PASS (5 tests green).

- [ ] **Step 5: Commit**

```bash
git add app/src/guide/useCases.ts app/src/guide/__tests__/useCases.test.ts
git commit -m "feat(guide): define UseCase type + register 13 cases (keys only)"
```

---

### Task 3: `guideDict.ts` skeleton + `GuideTKey` + `useGuideI18n` hook

**Files:**
- Create: `app/src/guide/guideDict.ts`
- Create: `app/src/guide/useGuideI18n.ts`
- Create: `app/src/guide/__tests__/useGuideI18n.test.tsx`

**Interfaces:**
- Consumes: `USE_CASES` from Task 2, `useI18n` from `@/i18n/useI18n` (existing)
- Produces:
  ```ts
  export const guideDict: { vi: Record<string, string>; en: Record<string, string> };
  export type GuideTKey = string;       // see note below
  export function useGuideI18n(): { lang: 'vi' | 'en'; t: (key: GuideTKey) => string };
  ```

Note on `GuideTKey`: ideally `keyof typeof guideDict['vi']`, but since the dict will be filled in Task 10 the literal type would shift between tasks. Use a `string` alias now and tighten in Task 10's commit if there's time. The data integrity test from Task 2 already guarantees key existence at runtime.

- [ ] **Step 1: Write the failing test**

Create `app/src/guide/__tests__/useGuideI18n.test.tsx`:
```tsx
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n/useI18n';
import { useGuideI18n } from '../useGuideI18n';
import { guideDict } from '../guideDict';

function Probe({ k }: { k: string }) {
  const { t } = useGuideI18n();
  return <span data-testid="out">{t(k)}</span>;
}

describe('useGuideI18n', () => {
  test('resolves an existing key in default vi', () => {
    render(<I18nProvider><Probe k="guide.modal.title" /></I18nProvider>);
    expect(screen.getByTestId('out').textContent).toBe(guideDict.vi['guide.modal.title']);
  });

  test('falls back to the key itself when unknown', () => {
    render(<I18nProvider><Probe k="does.not.exist" /></I18nProvider>);
    expect(screen.getByTestId('out').textContent).toBe('does.not.exist');
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- useGuideI18n
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Create `guideDict.ts` skeleton**

Create `app/src/guide/guideDict.ts`. Include only chrome strings + 1 fully-fleshed use case to prove the pattern; rest are filled in Task 10.

```ts
export const guideDict = {
  vi: {
    'guide.modal.title': 'Hướng dẫn WNAP',
    'guide.sidebar.overview': '🗺️ Tổng quan',
    'guide.sidebar.extras': 'Tính năng bổ sung',
    'guide.phase.setup': 'Giai đoạn 1: Thiết lập',
    'guide.phase.assign': 'Giai đoạn 2: Phân bổ',
    'guide.phase.daily': 'Giai đoạn 3: Hoạt động hàng ngày',
    'guide.phase.maint': 'Giai đoạn 4: Bảo trì',
    'guide.phase.family': 'Giai đoạn 5: Đồng bộ gia đình',
    'guide.section.steps': 'Các bước',
    'guide.section.example': 'Ví dụ',
    'guide.section.tips': '💡 Mẹo',
    // payday-assign (the proof-of-pattern case)
    'guide.uc.payday-assign.title': 'Ngày lương — Phân bổ mỗi đồng (Rule 1)',
    'guide.uc.payday-assign.step.1': 'Mở Plan tab',
    'guide.uc.payday-assign.step.2': 'Kiểm tra Sẵn sàng phân bổ (RTA) > 0',
    'guide.uc.payday-assign.step.3': 'Click "+ Phân bổ"',
    'guide.uc.payday-assign.step.4': 'Chọn category và nhập số tiền',
    'guide.uc.payday-assign.step.5': 'Lặp lại đến khi RTA = 0₫',
    'guide.uc.payday-assign.example':
      'Lương 20 triệu về tài khoản. RTA hiển thị 20.000.000₫. Phân bổ 5tr cho Tiền nhà, 3tr cho Ăn uống, 2tr Đi lại… cho đến khi RTA về 0.',
    'guide.uc.payday-assign.tip.1': 'Bắt đầu từ chi phí bắt buộc (Bills) trước, sau đó Needs, cuối cùng Wants.',
    'guide.uc.payday-assign.tip.2': 'Nếu lúng túng, dùng Auto-Assign → Underfunded để phân bổ tự động dựa trên Targets.',
  },
  en: {
    'guide.modal.title': 'WNAP User Guide',
    'guide.sidebar.overview': '🗺️ Overview',
    'guide.sidebar.extras': 'Extra features',
    'guide.phase.setup': 'Phase 1: Setup',
    'guide.phase.assign': 'Phase 2: Assigning',
    'guide.phase.daily': 'Phase 3: Daily activity',
    'guide.phase.maint': 'Phase 4: Maintenance',
    'guide.phase.family': 'Phase 5: Family sync',
    'guide.section.steps': 'Steps',
    'guide.section.example': 'Example',
    'guide.section.tips': '💡 Tips',
    'guide.uc.payday-assign.title': 'Payday — Give every dollar a job (Rule 1)',
    'guide.uc.payday-assign.step.1': 'Open the Plan tab',
    'guide.uc.payday-assign.step.2': 'Check that Ready to Assign (RTA) > 0',
    'guide.uc.payday-assign.step.3': 'Click "+ Assign"',
    'guide.uc.payday-assign.step.4': 'Pick a category and enter an amount',
    'guide.uc.payday-assign.step.5': 'Repeat until RTA reaches 0',
    'guide.uc.payday-assign.example':
      'Salary of 20M arrives. RTA shows 20,000,000₫. Assign 5M to Rent, 3M to Food, 2M to Transport… until RTA reaches 0.',
    'guide.uc.payday-assign.tip.1': 'Start with mandatory Bills, then Needs, then Wants.',
    'guide.uc.payday-assign.tip.2': 'If stuck, use Auto-Assign → Underfunded to allocate automatically based on Targets.',
  },
} as const;

export type GuideTKey = string;
```

- [ ] **Step 4: Implement `useGuideI18n` hook**

Create `app/src/guide/useGuideI18n.ts`:
```ts
import { useI18n } from '@/i18n/useI18n';
import { guideDict, type GuideTKey } from './guideDict';

export function useGuideI18n() {
  const { lang } = useI18n();
  const t = (key: GuideTKey): string => guideDict[lang]?.[key] ?? guideDict.vi[key] ?? key;
  return { lang, t };
}
```

- [ ] **Step 5: Run test, confirm pass**

```bash
npm run test -- useGuideI18n
```

Expected: PASS (2 tests green).

- [ ] **Step 6: Commit**

```bash
git add app/src/guide/guideDict.ts app/src/guide/useGuideI18n.ts app/src/guide/__tests__/useGuideI18n.test.tsx
git commit -m "feat(guide): add guideDict + useGuideI18n hook (skeleton, payday-assign filled)"
```

---

### Task 4: `GuideContent` component

**Files:**
- Create: `app/src/guide/GuideContent.tsx`
- Create: `app/src/guide/__tests__/GuideContent.test.tsx`

**Interfaces:**
- Consumes: `UseCase` from `./useCases`, `useGuideI18n` from `./useGuideI18n`
- Produces:
  ```ts
  export type GuideContentProps =
    | { kind: 'overview' }
    | { kind: 'useCase'; useCase: UseCase };
  export function GuideContent(props: GuideContentProps): JSX.Element;
  ```
  When `kind === 'overview'`, renders `<OverviewMindmap />` (imported lazily — for this task, just render a placeholder div with `data-testid="overview-placeholder"` that Task 7 will replace).

- [ ] **Step 1: Write the failing test**

Create `app/src/guide/__tests__/GuideContent.test.tsx`:
```tsx
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n/useI18n';
import { GuideContent } from '../GuideContent';
import { USE_CASES } from '../useCases';

const payday = USE_CASES.find((u) => u.id === 'payday-assign')!;

describe('GuideContent', () => {
  test('renders title, all 5 steps, example and 2 tips for payday-assign', () => {
    render(
      <I18nProvider>
        <GuideContent kind="useCase" useCase={payday} />
      </I18nProvider>,
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent)
      .toBe('Ngày lương — Phân bổ mỗi đồng (Rule 1)');
    const steps = screen.getAllByTestId('uc-step');
    expect(steps).toHaveLength(5);
    expect(steps[0].textContent).toContain('Mở Plan tab');
    expect(screen.getByTestId('uc-example').textContent).toContain('Lương 20 triệu');
    expect(screen.getAllByTestId('uc-tip')).toHaveLength(2);
  });

  test('renders overview placeholder when kind=overview', () => {
    render(
      <I18nProvider>
        <GuideContent kind="overview" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('overview-placeholder')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- GuideContent
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `GuideContent.tsx`**

```tsx
import { useGuideI18n } from './useGuideI18n';
import type { UseCase } from './useCases';

export type GuideContentProps =
  | { kind: 'overview' }
  | { kind: 'useCase'; useCase: UseCase };

export function GuideContent(props: GuideContentProps) {
  const { t } = useGuideI18n();
  if (props.kind === 'overview') {
    return <div data-testid="overview-placeholder" className="flex items-center justify-center min-h-[400px] text-muted-foreground">Overview mindmap (Task 7)</div>;
  }
  const { useCase: uc } = props;
  return (
    <article className="space-y-6">
      <h2 className="text-2xl font-bold">{t(uc.titleKey)}</h2>
      <section>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">{t('guide.section.steps')}</h3>
        <ol className="list-decimal pl-6 space-y-1">
          {uc.stepKeys.map((k) => (
            <li key={k} data-testid="uc-step">{t(k)}</li>
          ))}
        </ol>
      </section>
      <section className="rounded-md bg-muted p-3" data-testid="uc-example">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-1">{t('guide.section.example')}</h3>
        <p>{t(uc.exampleKey)}</p>
      </section>
      <section className="rounded-md bg-amber-50 p-3">
        <h3 className="text-sm font-semibold uppercase text-amber-800 mb-1">{t('guide.section.tips')}</h3>
        <ul className="list-disc pl-6 space-y-1">
          {uc.tipKeys.map((k) => (
            <li key={k} data-testid="uc-tip">{t(k)}</li>
          ))}
        </ul>
      </section>
      {uc.refImage && (
        <img src={uc.refImage} alt="" loading="lazy" className="rounded-md border max-w-full" />
      )}
    </article>
  );
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- GuideContent
```

Expected: PASS (2 tests green).

- [ ] **Step 5: Commit**

```bash
git add app/src/guide/GuideContent.tsx app/src/guide/__tests__/GuideContent.test.tsx
git commit -m "feat(guide): GuideContent renders use case sections + overview placeholder"
```

---

### Task 5: `GuideSidebar` component

**Files:**
- Create: `app/src/guide/GuideSidebar.tsx`
- Create: `app/src/guide/__tests__/GuideSidebar.test.tsx`

**Interfaces:**
- Consumes: `USE_CASES`, `PHASES` from `./useCases`, `useGuideI18n` from `./useGuideI18n`
- Produces:
  ```ts
  export type SidebarSelection = { kind: 'overview' } | { kind: 'useCase'; id: string };
  export function GuideSidebar(props: {
    selection: SidebarSelection;
    onSelect: (s: SidebarSelection) => void;
  }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

Create `app/src/guide/__tests__/GuideSidebar.test.tsx`:
```tsx
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/useI18n';
import { GuideSidebar } from '../GuideSidebar';

describe('GuideSidebar', () => {
  test('shows the overview item and all phase headers', () => {
    render(
      <I18nProvider>
        <GuideSidebar selection={{ kind: 'overview' }} onSelect={() => {}} />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: /Tổng quan/ })).toBeInTheDocument();
    expect(screen.getByText('Giai đoạn 1: Thiết lập')).toBeInTheDocument();
    expect(screen.getByText('Tính năng bổ sung')).toBeInTheDocument();
  });

  test('clicking a use case calls onSelect with its id', async () => {
    const onSelect = vi.fn();
    render(
      <I18nProvider>
        <GuideSidebar selection={{ kind: 'overview' }} onSelect={onSelect} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Payday|Ngày lương/i }));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'useCase', id: 'payday-assign' });
  });
});
```

Note: this test relies on `payday-assign` having a non-empty title in `guideDict.vi`, which Task 3 set up.

Install `@testing-library/user-event` if not present:
```bash
npm install -D @testing-library/user-event@^14
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- GuideSidebar
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `GuideSidebar.tsx`**

```tsx
import { useGuideI18n } from './useGuideI18n';
import { PHASES, USE_CASES, type Phase } from './useCases';

export type SidebarSelection = { kind: 'overview' } | { kind: 'useCase'; id: string };

const PHASE_KEY: Record<Phase, string> = {
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
    s.kind === selection.kind && (s.kind === 'overview' || s.id === (selection as { id: string }).id);
  const baseBtn = 'block w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-muted/50';
  const selBtn = 'bg-muted font-semibold';

  return (
    <nav className="flex flex-col gap-1 p-2 overflow-y-auto">
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
                  {t(u.titleKey)}
                </button>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- GuideSidebar
```

Expected: PASS (2 tests green).

- [ ] **Step 5: Commit**

```bash
git add app/src/guide/GuideSidebar.tsx app/src/guide/__tests__/GuideSidebar.test.tsx app/package.json app/package-lock.json
git commit -m "feat(guide): GuideSidebar with phases + use case selection"
```

---

### Task 6: `mainFunctions.ts` — Mermaid source builder

**Files:**
- Create: `app/src/guide/mainFunctions.ts`
- Create: `app/src/guide/__tests__/mainFunctions.test.ts`

**Interfaces:**
- Consumes: nothing (labels hardcoded in this file; can move to dict later)
- Produces:
  ```ts
  export type MmLang = 'vi' | 'en';
  export function buildMindmapSource(lang: MmLang): string;
  export const LEAF_TO_USECASE: Readonly<Record<string, string>>;  // leaf label → use case id
  ```

- [ ] **Step 1: Write the failing test**

Create `app/src/guide/__tests__/mainFunctions.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { buildMindmapSource, LEAF_TO_USECASE } from '../mainFunctions';
import { USE_CASES } from '../useCases';

describe('buildMindmapSource', () => {
  test('vi source starts with mindmap keyword', () => {
    expect(buildMindmapSource('vi')).toMatch(/^mindmap/);
  });

  test('vi source contains all three top-level branches', () => {
    const s = buildMindmapSource('vi');
    expect(s).toContain('Lập kế hoạch');
    expect(s).toContain('Sổ giao dịch');
    expect(s).toContain('Gia đình');
  });

  test('en source contains translated branches', () => {
    const s = buildMindmapSource('en');
    expect(s).toContain('Plan');
    expect(s).toContain('Ledger');
    expect(s).toContain('Family');
  });

  test('every value in LEAF_TO_USECASE is a known use case id', () => {
    const known = new Set(USE_CASES.map((u) => u.id));
    for (const id of Object.values(LEAF_TO_USECASE)) {
      expect(known).toContain(id);
    }
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- mainFunctions
```

Expected: FAIL.

- [ ] **Step 3: Implement `mainFunctions.ts`**

```ts
export type MmLang = 'vi' | 'en';

const VI = `mindmap
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
      Cùng quản lý ngân sách`;

const EN = `mindmap
  root((📊 WNAP))
    🎯 Plan
      Categories & Groups
      Ready to Assign
      Targets
        Set aside
        Refill
        Have balance by date
      Auto-Assign
      Move Money
      Snooze
      Status filters
    📓 Ledger
      Accounts
      Transactions
        Outflow
        Inflow
        Transfer
      Reconcile
    👨‍👩‍👧 Family
      Invite member
      Shared budget`;

export function buildMindmapSource(lang: MmLang): string {
  return lang === 'en' ? EN : VI;
}

// Maps a leaf label (in either lang) to the use case id it should navigate to.
// Leaves without a matching case (e.g. "Ready to Assign") are intentionally absent.
export const LEAF_TO_USECASE: Readonly<Record<string, string>> = {
  // vi labels
  'Danh mục & Nhóm': 'design-categories',
  'Tài khoản': 'connect-accounts',
  'Auto-Assign': 'auto-assign',
  'Move Money': 'move-money',
  'Snooze': 'snooze-target',
  'Bộ lọc trạng thái': 'filter-cards',
  'Đối soát': 'reconcile',
  'Mời thành viên': 'invite-member',
  'Cùng quản lý ngân sách': 'use-together',
  // en labels
  'Categories & Groups': 'design-categories',
  'Accounts': 'connect-accounts',
  'Status filters': 'filter-cards',
  'Reconcile': 'reconcile',
  'Invite member': 'invite-member',
  'Shared budget': 'use-together',
};
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- mainFunctions
```

Expected: PASS (4 tests green).

- [ ] **Step 5: Commit**

```bash
git add app/src/guide/mainFunctions.ts app/src/guide/__tests__/mainFunctions.test.ts
git commit -m "feat(guide): Mermaid mindmap source builder (vi + en) with leaf→useCase map"
```

---

### Task 7: `OverviewMindmap` component (lazy Mermaid)

**Files:**
- Create: `app/src/guide/OverviewMindmap.tsx`
- Create: `app/src/guide/__tests__/OverviewMindmap.test.tsx`
- Modify: `app/src/guide/GuideContent.tsx` (swap placeholder for `<OverviewMindmap />`)

**Interfaces:**
- Consumes: `buildMindmapSource`, `LEAF_TO_USECASE` from `./mainFunctions`, `useGuideI18n` for `lang`
- Produces:
  ```ts
  export function OverviewMindmap(props: {
    onSelectLeaf: (id: string) => void;
  }): JSX.Element;
  ```
  The component dynamically imports `mermaid` and renders the SVG into a ref. When a leaf is clicked and its label is in `LEAF_TO_USECASE`, calls `onSelectLeaf(id)`.

- [ ] **Step 1: Write the failing test**

Create `app/src/guide/__tests__/OverviewMindmap.test.tsx`:
```tsx
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n/useI18n';

// Mock mermaid so the test doesn't depend on real rendering
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({
      svg: '<svg data-testid="mock-mermaid"><text>Lập kế hoạch</text></svg>',
      bindFunctions: () => {},
    }),
  },
}));

import { OverviewMindmap } from '../OverviewMindmap';

describe('OverviewMindmap', () => {
  test('renders mermaid SVG after dynamic import', async () => {
    render(
      <I18nProvider>
        <OverviewMindmap onSelectLeaf={() => {}} />
      </I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- OverviewMindmap
```

Expected: FAIL.

- [ ] **Step 3: Implement `OverviewMindmap.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { useGuideI18n } from './useGuideI18n';
import { buildMindmapSource, LEAF_TO_USECASE } from './mainFunctions';

let renderCounter = 0;

export function OverviewMindmap({ onSelectLeaf }: { onSelectLeaf: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { lang } = useGuideI18n();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
      const id = `wnap-mindmap-${++renderCounter}`;
      const { svg, bindFunctions } = await mermaid.render(id, buildMindmapSource(lang));
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = svg;
      bindFunctions?.(containerRef.current);

      // Attach click handlers to leaf <text> elements
      containerRef.current.querySelectorAll('text').forEach((node) => {
        const label = node.textContent?.trim() ?? '';
        const useCaseId = LEAF_TO_USECASE[label];
        if (useCaseId) {
          node.style.cursor = 'pointer';
          node.style.textDecoration = 'underline';
          node.addEventListener('click', () => onSelectLeaf(useCaseId));
        }
      });
    })();
    return () => { cancelled = true; };
  }, [lang, onSelectLeaf]);

  return <div ref={containerRef} className="flex justify-center w-full overflow-auto" />;
}
```

- [ ] **Step 4: Update `GuideContent.tsx` to use `OverviewMindmap`**

Replace the placeholder branch:
```tsx
// in GuideContent.tsx
import { OverviewMindmap } from './OverviewMindmap';

// ...
if (props.kind === 'overview') {
  return <OverviewMindmap onSelectLeaf={props.onSelectLeaf ?? (() => {})} />;
}
```

And update `GuideContentProps`:
```ts
export type GuideContentProps =
  | { kind: 'overview'; onSelectLeaf?: (id: string) => void }
  | { kind: 'useCase'; useCase: UseCase };
```

Also update the `GuideContent` test from Task 4 — the overview case now needs to mock mermaid; the simplest fix is to test `overview` in the OverviewMindmap test (which already does) and have `GuideContent.test.tsx` skip the overview assertion. Edit the existing test:
```tsx
// in GuideContent.test.tsx — replace the second test
test('renders OverviewMindmap when kind=overview', async () => {
  vi.mock('mermaid', () => ({
    default: {
      initialize: vi.fn(),
      render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="ovw"></svg>', bindFunctions: () => {} }),
    },
  }));
  render(<I18nProvider><GuideContent kind="overview" /></I18nProvider>);
  await screen.findByTestId('ovw');
});
```

- [ ] **Step 5: Run all guide tests, confirm pass**

```bash
npm run test -- guide
```

Expected: all guide tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/guide/OverviewMindmap.tsx app/src/guide/__tests__/OverviewMindmap.test.tsx app/src/guide/GuideContent.tsx app/src/guide/__tests__/GuideContent.test.tsx
git commit -m "feat(guide): OverviewMindmap with lazy mermaid + leaf click → use case"
```

---

### Task 8: `GuideModal` — Dialog wrapper + selection state

**Files:**
- Create: `app/src/guide/GuideModal.tsx`
- Create: `app/src/guide/__tests__/GuideModal.test.tsx`

**Interfaces:**
- Consumes: `GuideSidebar`, `GuideContent`, `USE_CASES`
- Produces:
  ```ts
  export function GuideModal(props: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element;
  ```

Uses Radix Dialog primitive. Look at existing dialogs in the codebase (e.g. `app/src/plan/TargetEditorModal.tsx`) to match the project's styling convention for trigger-less controlled dialogs.

- [ ] **Step 1: Write the failing test**

Create `app/src/guide/__tests__/GuideModal.test.tsx`:
```tsx
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/useI18n';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mm"></svg>', bindFunctions: () => {} }),
  },
}));

import { GuideModal } from '../GuideModal';

describe('GuideModal', () => {
  test('opens with overview selected, switches content when a use case is clicked', async () => {
    render(
      <I18nProvider>
        <GuideModal open={true} onOpenChange={() => {}} />
      </I18nProvider>,
    );
    // overview placeholder/mermaid mock should be visible initially
    await screen.findByTestId('mm');
    // click "Ngày lương — Phân bổ mỗi đồng (Rule 1)" in sidebar
    await userEvent.click(screen.getByRole('button', { name: /Ngày lương/ }));
    expect(
      screen.getByRole('heading', { level: 2, name: /Ngày lương/ }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- GuideModal
```

Expected: FAIL.

- [ ] **Step 3: Implement `GuideModal.tsx`**

```tsx
import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { GuideSidebar, type SidebarSelection } from './GuideSidebar';
import { GuideContent } from './GuideContent';
import { USE_CASES } from './useCases';
import { useGuideI18n } from './useGuideI18n';

export function GuideModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useGuideI18n();
  const [sel, setSel] = useState<SidebarSelection>({ kind: 'overview' });

  const handleLeafClick = useCallback((id: string) => {
    setSel({ kind: 'useCase', id });
  }, []);

  const currentCase = sel.kind === 'useCase' ? USE_CASES.find((u) => u.id === sel.id) : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-[1100px] h-[84vh] bg-background rounded-lg shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Dialog.Title className="text-lg font-bold">📖 {t('guide.modal.title')}</Dialog.Title>
            <Dialog.Close className="p-1 rounded hover:bg-muted">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] flex-1 min-h-0">
            <aside className="border-r overflow-y-auto">
              <GuideSidebar selection={sel} onSelect={setSel} />
            </aside>
            <main className="overflow-y-auto p-6">
              {sel.kind === 'overview' ? (
                <GuideContent kind="overview" onSelectLeaf={handleLeafClick} />
              ) : currentCase ? (
                <GuideContent kind="useCase" useCase={currentCase} />
              ) : null}
            </main>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- GuideModal
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/guide/GuideModal.tsx app/src/guide/__tests__/GuideModal.test.tsx
git commit -m "feat(guide): GuideModal — radix Dialog + sidebar+content layout"
```

---

### Task 9: `GuideButton` + add 1 dict.ts key + wire into header

**Files:**
- Modify: `app/src/i18n/dict.ts` (add `guide.button.tooltip` to vi and en blocks)
- Create: `app/src/guide/GuideButton.tsx`
- Modify: `app/src/App.tsx:67-77` (insert `<GuideButton />` before `<LangSwitch />`)
- Create: `app/src/guide/__tests__/GuideButton.test.tsx`

**Interfaces:**
- Consumes: dynamic import of `./GuideModal`
- Produces: `<GuideButton />` — JSX element, no props.

- [ ] **Step 1: Add the dict key**

Edit `app/src/i18n/dict.ts`. In the `vi` block, add near the existing `'common.*'` group:
```ts
'guide.button.tooltip': 'Hướng dẫn sử dụng',
```
In the `en` block, add the matching key:
```ts
'guide.button.tooltip': 'User guide',
```

- [ ] **Step 2: Write the failing component test**

Create `app/src/guide/__tests__/GuideButton.test.tsx`:
```tsx
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/useI18n';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mm"></svg>', bindFunctions: () => {} }),
  },
}));

import { GuideButton } from '../GuideButton';

describe('GuideButton', () => {
  test('renders with the tooltip aria-label', () => {
    render(<I18nProvider><GuideButton /></I18nProvider>);
    expect(screen.getByRole('button', { name: /Hướng dẫn sử dụng/ })).toBeInTheDocument();
  });

  test('clicking opens the modal', async () => {
    render(<I18nProvider><GuideButton /></I18nProvider>);
    await userEvent.click(screen.getByRole('button', { name: /Hướng dẫn sử dụng/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test, confirm it fails**

```bash
npm run test -- GuideButton
```

Expected: FAIL.

- [ ] **Step 4: Implement `GuideButton.tsx`**

```tsx
import { lazy, Suspense, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

const GuideModal = lazy(() => import('./GuideModal').then((m) => ({ default: m.GuideModal })));

export function GuideButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const label = t('guide.button.tooltip');
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
      >
        <BookOpen className="h-4 w-4" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <GuideModal open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
```

- [ ] **Step 5: Wire into `App.tsx`**

Edit `app/src/App.tsx`. Add the import near other guide-less imports:
```ts
import { GuideButton } from './guide/GuideButton';
```

Modify the existing header block (currently lines 67-77). Change the right-side `<div>` from:
```tsx
<div className="flex items-center gap-2">
  <LangSwitch />
  <UserMenu .../>
</div>
```
to:
```tsx
<div className="flex items-center gap-2">
  <GuideButton />
  <LangSwitch />
  <UserMenu .../>
</div>
```

- [ ] **Step 6: Run all tests**

```bash
npm run test
```

Expected: every existing + new test PASS.

- [ ] **Step 7: Verify lazy chunk in build**

```bash
npm run build
```

Expected output should list two relevant chunks in `dist/assets/`:
- `index-*.js` — main bundle (only ~1KB larger than baseline from Task 1 Step 6)
- A new chunk such as `GuideModal-*.js` or `guide-*.js` in the ~280-320 KB range (contains mermaid + guide code)

If `mermaid` shows up in the main `index-*.js` chunk, the dynamic import was broken (probably the `lazy()` wrapper). Fix before committing.

- [ ] **Step 8: Commit**

```bash
git add app/src/i18n/dict.ts app/src/guide/GuideButton.tsx app/src/guide/__tests__/GuideButton.test.tsx app/src/App.tsx
git commit -m "feat(guide): header button (before LangSwitch) lazy-loads guide modal"
```

---

### Task 10: Populate all 13 use cases content (vi + en)

**Files:**
- Modify: `app/src/guide/guideDict.ts` (add ~13 × 9 keys × 2 langs ≈ 234 entries)

**Interfaces:**
- Consumes: `USE_CASES` key shapes from Task 2 (one of: `guide.uc.<id>.title`, `.example`, `.step.{N}`, `.tip.{N}`)
- Produces: every key referenced by `USE_CASES` resolves to real Vietnamese / English text.

This task is content-heavy. The implementer should open `wnap/knowledge-based/ynap-all-use-case.md` and the four `*.txt` files at the WNAP repo root and translate/adapt situations 1-9 into Vietnamese first, then English. For cases 10-13 (Snooze, Move Money, Invite member, Filter cards), write fresh content based on reading `app/src/plan/TargetEditorModal.tsx`, `app/src/plan/MoveMoneyModal.tsx`, `app/src/budget/InviteDialog.tsx`, and `app/src/engine/filters.ts`.

- [ ] **Step 1: Write the failing test that locks completeness**

Append to `app/src/guide/__tests__/useCases.test.ts`:
```ts
import { guideDict } from '../guideDict';

test('every titleKey / exampleKey / stepKeys / tipKeys resolves in both vi and en', () => {
  const allKeys = USE_CASES.flatMap((u) => [u.titleKey, u.exampleKey, ...u.stepKeys, ...u.tipKeys]);
  for (const lang of ['vi', 'en'] as const) {
    for (const k of allKeys) {
      const v = (guideDict[lang] as Record<string, string>)[k];
      expect(v, `${lang} missing ${k}`).toBeDefined();
      expect(v!.length, `${lang} empty ${k}`).toBeGreaterThan(0);
    }
  }
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm run test -- useCases
```

Expected: FAIL with many missing keys (Task 3 only filled `payday-assign`).

- [ ] **Step 3: Fill all remaining keys in `guideDict.ts`**

For each of the 12 remaining use case ids (`design-categories`, `connect-accounts`, `auto-assign`, `record-transaction`, `overspend-roll`, `reconcile`, `use-together`, `check-wallet`, `snooze-target`, `move-money`, `invite-member`, `filter-cards`), add to `guideDict.vi` AND `guideDict.en` the same key set you used for `payday-assign`:
- `guide.uc.<id>.title`
- `guide.uc.<id>.step.1` … `step.N` (N matches the count registered in `useCases.ts`)
- `guide.uc.<id>.example`
- `guide.uc.<id>.tip.1` … `tip.M` (M matches)

**Sources:**
- Cases 1-9 → translate/adapt from `wnap/knowledge-based/ynap-all-use-case.md` Situations 1-9
- Cases 10-13 → write fresh; reference these code files for accuracy:
  - `snooze-target` → `app/src/plan/TargetEditorModal.tsx` (look for `setSnooze`)
  - `move-money` → `app/src/plan/MoveMoneyModal.tsx`
  - `invite-member` → `app/src/budget/InviteDialog.tsx` + `app/src/pages/SetupPage.tsx` join-code flow
  - `filter-cards` → `app/src/engine/filters.ts` + the 5 buttons rendered in `app/src/plan/PlanScreen.tsx`

Keep Vietnamese tone friendly and concrete (use real-feeling numbers like `5tr`, `20.000.000₫`, etc.). English mirrors the Vietnamese meaning, not literal — adapt idioms.

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- useCases
```

Expected: PASS — the new completeness test green; the other 5 still green.

- [ ] **Step 5: Tighten `GuideTKey` type (optional but recommended)**

In `app/src/guide/guideDict.ts`, replace:
```ts
export type GuideTKey = string;
```
with:
```ts
export type GuideTKey = keyof typeof guideDict['vi'];
```

Run `npx tsc --noEmit` from `app/` and fix any new type errors (call sites in `GuideContent.tsx`, etc. should already be passing valid keys via `UseCase` records, so this should be a no-op).

- [ ] **Step 6: Commit**

```bash
git add app/src/guide/guideDict.ts app/src/guide/__tests__/useCases.test.ts
git commit -m "feat(guide): fill all 13 use cases content in vi + en; tighten GuideTKey"
```

---

### Task 11: Screenshots + mobile responsive + manual E2E + push

**Files:**
- Create directory: `app/public/guide/`
- Copy 4 PNGs from repo root into it
- Modify: `app/src/guide/GuideSidebar.tsx` (add mobile dropdown fallback)
- Modify: `app/src/guide/GuideModal.tsx` (responsive layout adjustments if needed)

**Interfaces:**
- No type changes; only CSS / asset wiring + manual verification.

- [ ] **Step 1: Copy screenshots into the public folder**

From repo root (`C:/Users/thaoly/OneDrive/Desktop/WNAP`):
```bash
mkdir -p app/public/guide
cp Plan_overview.png Plan_clickACategory.png Targer-details.png AddTransaction.png app/public/guide/
```

Verify the paths in `USE_CASES` match (already set as `/guide/Plan_overview.png` etc. in Task 2).

- [ ] **Step 2: Mobile sidebar fallback**

The 2-column grid already collapses to single column at `sm:`. For mobile, the sidebar showing all phases is too tall. Modify `GuideSidebar.tsx` to render a `<select>` dropdown at narrow widths:

At the top of `GuideSidebar`'s return, before the `<nav>`:
```tsx
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
              <option key={u.id} value={u.id}>{t(u.titleKey)}</option>
            ))}
          </optgroup>
        );
      })}
    </select>
    <nav className="hidden sm:flex flex-col gap-1 p-2 overflow-y-auto">
      {/* ... existing buttons ... */}
    </nav>
  </>
);
```

- [ ] **Step 3: Run all tests one more time**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 4: Build and inspect bundle**

```bash
npm run build
```

Confirm main bundle did not regress (compare with baseline from Task 1 Step 6, then post-Task-9 size). Note the final guide chunk size in the commit message.

- [ ] **Step 5: Manual E2E with Playwright MCP**

Start dev server:
```bash
npm run dev
```

Then in Claude Code with Playwright MCP loaded, run:
1. Navigate to `http://localhost:5173/`
2. Sign in with the existing test account (`test.wnap@gmail.com` / `TestWnap2026!`)
3. Snapshot the header — confirm the new `BookOpen` icon appears immediately before the language flag
4. Click the guide button — modal opens, "🗺️ Tổng quan" selected, Mermaid mindmap rendered
5. Click sidebar item "Ngày lương — Phân bổ mỗi đồng (Rule 1)" — content swaps to that case
6. Click sidebar item "Auto-Assign" — content swaps; if `refImage` is set, image visible
7. Click the EN flag in header to switch language — modal content re-renders in English
8. Close modal (X button) — modal disappears, app state unchanged
9. Resize browser to 375px width — sidebar collapses into dropdown; switching via dropdown works
10. Take a final full-page screenshot for the commit

- [ ] **Step 6: Commit + push**

```bash
git add app/public/guide app/src/guide/GuideSidebar.tsx app/src/guide/GuideModal.tsx
git commit -m "feat(guide): screenshots + mobile sidebar dropdown + manual E2E pass"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Architecture (9 new files) → Tasks 1-9 collectively create them
- Mermaid lazy load → Task 7 dynamic import + Task 9 lazy() wrapper; Task 9 Step 7 verifies chunking
- Header button placement (before LangSwitch) → Task 9 Step 5 exact edit
- Modal layout (260px sidebar, grid, height) → Task 8 implementation
- Mindmap clickable leaves → Task 7 leaf click handler + `LEAF_TO_USECASE` map (Task 6)
- 13 use cases listed → Task 2 registers all 13; Task 10 fills content
- Both languages → Task 3 hook + Task 10 completeness test
- Screenshots → Task 11 Step 1
- Mobile responsive → Task 11 Step 2
- Manual E2E → Task 11 Step 5
- Tests: data integrity (Task 2/10), hook (Task 3), components (Tasks 4/5/7/8/9) → all present

**Placeholder scan:** no TBD/TODO; every code step shows real code. Task 10 Step 3 *describes* content authoring rather than dictating every Vietnamese string — that's intentional because content authoring isn't mechanical; the completeness test (Step 1) is the contract.

**Type consistency:**
- `SidebarSelection` shape used in Task 5 (`{ kind, id? }`) is the same in Task 8 — ✓
- `GuideContentProps` extended in Task 7 with optional `onSelectLeaf` — Task 8 passes it — ✓
- `MmLang` from Task 6 vs `Lang` from i18n — both are `'vi' | 'en'`; Task 7 imports `lang` from `useGuideI18n` (returns the same union) — ✓
- `LEAF_TO_USECASE` values are use case ids referenced as strings; Task 8 uses them in `setSel({ kind: 'useCase', id })` — ✓
- `GuideTKey` is `string` in Task 3, tightened in Task 10 Step 5 — call sites use keys via `UseCase` records (which produce strings), so the tightening is a no-op at runtime — ✓
