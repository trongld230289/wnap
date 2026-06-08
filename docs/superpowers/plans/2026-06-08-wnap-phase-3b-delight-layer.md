# Delight Layer (Phase 3B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm lớp micro-animation "money as light" cho WNAP (assign / đạt target / cover overspent / nhận lương + count-up nền), thuần CSS + rAF, không đổi engine/logic.

**Architecture:** Module mới `app/src/delight/`. Phần quyết định (signal detection, gating) là **pure function** test bằng vitest (node env, như 94 test hiện có). Animation thuần thị giác chạy bằng CSS keyframes + một component `<Count>` dùng `requestAnimationFrame`. Mỗi component tự phát celebration của nó qua `usePrevious` diff — không event-bus toàn cục. `DelightProvider` cung cấp cờ `enabled = userSetting && !prefersReducedMotion`.

**Tech Stack:** React 19 + TypeScript, Tailwind v4 design tokens (3A), CSS keyframes, `requestAnimationFrame`. **KHÔNG framer-motion, KHÔNG Lottie/3D, KHÔNG dependency mới** (deviation có chủ đích so với spec — prototype đã chứng minh CSS+rAF đủ chất, nhẹ hơn, dễ gate reduced-motion).

**Lưu ý chung:**
- Type-check thật = `npm run build` (root `tsconfig.json` có `files: []`; `tsc --noEmit` là no-op).
- Mọi lệnh chạy trong `app/`. Test: `npm test -- --run <path>`.
- Branch: `feat/wnap-phase-3b-delight-layer`. Commit nhỏ theo từng task.
- Màu lấy từ CSS var đã có ở `index.css`: `--status-green --status-amber --status-red`.

---

### Task 0: Tạo branch

- [ ] **Step 1: Tạo branch từ main**

Run:
```bash
git checkout main && git pull --ff-only 2>/dev/null; git checkout -b feat/wnap-phase-3b-delight-layer
```
Expected: `Switched to a new branch 'feat/wnap-phase-3b-delight-layer'`

---

### Task 1: Motion tokens + CSS keyframes scaffold

**Files:**
- Create: `app/src/delight/motion.ts`
- Create: `app/src/delight/delight.css`
- Modify: `app/src/main.tsx` (thêm 1 dòng import)

- [ ] **Step 1: Tạo `app/src/delight/motion.ts`**

```ts
/** Token thời lượng/easing cho Delight Layer (dùng bởi <Count> và timeout celebration). */
export const COUNT_MS = 850;
export const SWEEP_MS = 900;
export const HEAL_MS = 1000;
export const SPARKLE_MS = 900;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
```

- [ ] **Step 2: Tạo `app/src/delight/delight.css`**

```css
/* ===== WNAP Delight Layer — CSS keyframes (thuần trình bày) ===== */

/* RTA pill: gợn sáng đẩy ra (assign) + glow (payday) */
.dl-ripple { position:absolute; inset:0; border-radius:inherit; border:2px solid var(--status-green); opacity:0; pointer-events:none; }
.dl-emit .dl-ripple { animation:dl-emit .7s ease-out; }
@keyframes dl-emit { 0%{opacity:.55; transform:scale(1)} 100%{opacity:0; transform:scale(1.3)} }
.dl-glow { box-shadow:0 0 0 6px color-mix(in srgb, var(--status-green) 14%, transparent), 0 0 24px color-mix(in srgb, var(--status-green) 45%, transparent); }
.dl-bump { animation:dl-bump .7s cubic-bezier(.18,1.3,.3,1); }
@keyframes dl-bump { 0%{transform:scale(1)} 35%{transform:scale(1.08)} 100%{transform:scale(1)} }

/* Available cell: vệt sáng nhận vào (assign) + heal đỏ→trong (cover) */
.dl-sweep { position:absolute; inset:0; pointer-events:none; opacity:0; overflow:hidden; border-radius:8px; }
.dl-sweep::before { content:''; position:absolute; top:0; bottom:0; width:60%;
  background:linear-gradient(100deg, transparent, color-mix(in srgb, var(--status-green) 22%, transparent), transparent);
  transform:translateX(-170%); }
.dl-receive .dl-sweep { opacity:1; }
.dl-receive .dl-sweep::before { animation:dl-sweepmove .9s ease-out; }
@keyframes dl-sweepmove { to{ transform:translateX(270%) } }
.dl-heal { animation:dl-heal 1s ease-out; border-radius:8px; }
@keyframes dl-heal { 0%{ background:color-mix(in srgb, var(--status-red) 16%, transparent) } 100%{ background:transparent } }

/* Status dot → check (đạt target) */
.dl-status { position:relative; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; flex:none; }
.dl-status .dl-dot { width:9px; height:9px; border-radius:50%; transition:width .4s, height .4s; }
.dl-status.dl-done .dl-dot { width:16px; height:16px; }
.dl-status svg { position:absolute; inset:0; width:16px; height:16px; pointer-events:none; }
.dl-status path { stroke:#fff; stroke-width:2.2; fill:none; stroke-linecap:round; stroke-linejoin:round;
  stroke-dasharray:14; stroke-dashoffset:14; transition:stroke-dashoffset .4s ease .2s; }
.dl-status.dl-done path { stroke-dashoffset:0; }

/* Sparkle burst nhỏ */
.dl-sparkle { position:absolute; left:8px; top:8px; pointer-events:none; }
.dl-sparkle i { position:absolute; width:6px; height:6px; border-radius:2px; opacity:0; animation:dl-spark .9s ease-out forwards; }
@keyframes dl-spark { 0%{opacity:0; transform:translate(0,0) scale(.4)} 25%{opacity:1} 100%{opacity:0; transform:translate(var(--tx),var(--ty)) scale(1) rotate(160deg)} }

/* Tôn trọng prefers-reduced-motion ở tầng CSS (belt-and-suspenders; tầng JS cũng gate) */
@media (prefers-reduced-motion: reduce) {
  .dl-emit .dl-ripple, .dl-bump, .dl-receive .dl-sweep::before, .dl-heal, .dl-sparkle i { animation:none !important; }
  .dl-status .dl-dot, .dl-status path { transition:none !important; }
}
```

- [ ] **Step 3: Import CSS vào `app/src/main.tsx`**

Thêm dòng import ngay sau `import './index.css'` (dòng 7):
```ts
import './index.css'
import './delight/delight.css'
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build PASS (chỉ còn cảnh báo chunk-size có sẵn).

- [ ] **Step 5: Commit**

```bash
git add app/src/delight/motion.ts app/src/delight/delight.css app/src/main.tsx
git commit -m "feat(delight): motion tokens + CSS keyframes scaffold"
```

---

### Task 2: Pure signal detection (TDD)

**Files:**
- Create: `app/src/delight/signals.ts`
- Test: `app/src/delight/__tests__/signals.test.ts`

- [ ] **Step 1: Viết test thất bại `app/src/delight/__tests__/signals.test.ts`**

```ts
import { expect, test } from 'vitest';
import { detectRowSignal, detectRtaSignal } from '../signals';

test('đạt target: vàng → xanh', () => {
  expect(detectRowSignal({ color: 'yellow', assigned: 100 }, { color: 'green', assigned: 200 })).toBe('target-reached');
});

test('cover overspent: đỏ → khác đỏ', () => {
  expect(detectRowSignal({ color: 'red', assigned: 0 }, { color: 'green', assigned: 300 })).toBe('cover');
  expect(detectRowSignal({ color: 'red', assigned: 0 }, { color: 'gray', assigned: 0 })).toBe('cover');
});

test('assign: assigned tăng mà không đổi nhóm màu đặc biệt', () => {
  expect(detectRowSignal({ color: 'green', assigned: 100 }, { color: 'green', assigned: 300 })).toBe('assign');
});

test('target-reached ưu tiên hơn assign khi cùng xảy ra', () => {
  // assign đẩy vàng→xanh: vẫn trả target-reached
  expect(detectRowSignal({ color: 'yellow', assigned: 100 }, { color: 'green', assigned: 400 })).toBe('target-reached');
});

test('không có gì: giá trị/màu giữ nguyên', () => {
  expect(detectRowSignal({ color: 'green', assigned: 100 }, { color: 'green', assigned: 100 })).toBe('none');
});

test('assigned giảm: không phải celebration', () => {
  expect(detectRowSignal({ color: 'green', assigned: 300 }, { color: 'green', assigned: 100 })).toBe('none');
});

test('RTA tăng = payday, giảm = assign, bằng = none', () => {
  expect(detectRtaSignal(5_000_000, 20_000_000)).toBe('payday');
  expect(detectRtaSignal(5_000_000, 3_000_000)).toBe('spend-assign');
  expect(detectRtaSignal(5_000_000, 5_000_000)).toBe('none');
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm test -- --run src/delight/__tests__/signals.test.ts`
Expected: FAIL — `Failed to resolve import "../signals"`.

- [ ] **Step 3: Viết `app/src/delight/signals.ts`**

```ts
import type { BarColor } from '../budget/barFill';

export type RowSnapshot = { color: BarColor; assigned: number };
export type RowSignal = 'assign' | 'target-reached' | 'cover' | 'none';
export type RtaSignal = 'payday' | 'spend-assign' | 'none';

/** Suy ra loại celebration cho 1 category từ trạng thái render trước → hiện tại. */
export function detectRowSignal(prev: RowSnapshot, next: RowSnapshot): RowSignal {
  if (prev.color === 'yellow' && next.color === 'green') return 'target-reached';
  if (prev.color === 'red' && next.color !== 'red') return 'cover';
  if (next.assigned > prev.assigned) return 'assign';
  return 'none';
}

/** RTA tăng → nạp tiền (payday); giảm → vừa phân bổ (assign). */
export function detectRtaSignal(prev: number, next: number): RtaSignal {
  if (next > prev) return 'payday';
  if (next < prev) return 'spend-assign';
  return 'none';
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm test -- --run src/delight/__tests__/signals.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add app/src/delight/signals.ts app/src/delight/__tests__/signals.test.ts
git commit -m "feat(delight): pure signal detection (assign/target/cover/payday)"
```

---

### Task 3: Reduced-motion gate (TDD) + hooks + provider

**Files:**
- Create: `app/src/delight/gate.ts`
- Test: `app/src/delight/__tests__/gate.test.ts`
- Create: `app/src/delight/useReducedMotion.ts`
- Create: `app/src/delight/usePrevious.ts`
- Create: `app/src/delight/useDelight.tsx`

- [ ] **Step 1: Viết test thất bại `app/src/delight/__tests__/gate.test.ts`**

```ts
import { expect, test } from 'vitest';
import { shouldAnimate } from '../gate';

test('bật khi user cho phép và OS không yêu cầu giảm chuyển động', () => {
  expect(shouldAnimate(false, true)).toBe(true);
});
test('tắt khi OS yêu cầu giảm chuyển động', () => {
  expect(shouldAnimate(true, true)).toBe(false);
});
test('tắt khi user tắt setting', () => {
  expect(shouldAnimate(false, false)).toBe(false);
});
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `npm test -- --run src/delight/__tests__/gate.test.ts`
Expected: FAIL — `Failed to resolve import "../gate"`.

- [ ] **Step 3: Viết `app/src/delight/gate.ts`**

```ts
/** Animation chỉ chạy khi user bật VÀ OS không yêu cầu giảm chuyển động. */
export function shouldAnimate(osReducedMotion: boolean, userEnabled: boolean): boolean {
  return userEnabled && !osReducedMotion;
}
```

- [ ] **Step 4: Chạy test xác nhận PASS**

Run: `npm test -- --run src/delight/__tests__/gate.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Viết `app/src/delight/usePrevious.ts`**

```ts
import { useEffect, useRef } from 'react';

/** Giá trị của lần render trước (undefined ở lần render đầu). */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}
```

- [ ] **Step 6: Viết `app/src/delight/useReducedMotion.ts`**

```ts
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** true nếu OS yêu cầu giảm chuyển động (cập nhật realtime). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
```

- [ ] **Step 7: Viết `app/src/delight/useDelight.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { shouldAnimate } from './gate';
import { useReducedMotion } from './useReducedMotion';

interface DelightCtx {
  enabled: boolean;      // có chạy animation không (đã gộp OS + setting)
  userEnabled: boolean;  // setting của user
  toggle: () => void;
}

const Ctx = createContext<DelightCtx>({ enabled: true, userEnabled: true, toggle: () => {} });
export const useDelight = () => useContext(Ctx);

const KEY = 'wnap.motion';

export function DelightProvider({ children }: { children: React.ReactNode }) {
  const [userEnabled, setUserEnabled] = useState(() => localStorage.getItem(KEY) !== 'off');
  const reduced = useReducedMotion();
  const enabled = shouldAnimate(reduced, userEnabled);

  useEffect(() => { localStorage.setItem(KEY, userEnabled ? 'on' : 'off'); }, [userEnabled]);

  return (
    <Ctx.Provider value={{ enabled, userEnabled, toggle: () => setUserEnabled((v) => !v) }}>
      {children}
    </Ctx.Provider>
  );
}
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/src/delight/gate.ts app/src/delight/__tests__/gate.test.ts app/src/delight/usePrevious.ts app/src/delight/useReducedMotion.ts app/src/delight/useDelight.tsx
git commit -m "feat(delight): reduced-motion gate + hooks + DelightProvider"
```

---

### Task 4: `<Count>` (số count-up có easing)

**Files:**
- Create: `app/src/delight/Count.tsx`

- [ ] **Step 1: Viết `app/src/delight/Count.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { formatVnd } from '../budget/format';
import { useDelight } from './useDelight';
import { COUNT_MS, easeOutCubic } from './motion';

/** Hiển thị số tiền, count-up có gia tốc khi đổi giá trị; tôn trọng reduced-motion. */
export function Count({ value, suffix = '' }: { value: number; suffix?: string }) {
  const { enabled } = useDelight();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled || fromRef.current === value) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const p = Math.min((now - t0) / COUNT_MS, 1);
      setDisplay(from + (value - from) * easeOutCubic(p));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, enabled]);

  return <span className="tabular-nums">{formatVnd(Math.round(display))}{suffix}</span>;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/delight/Count.tsx
git commit -m "feat(delight): <Count> rAF count-up component"
```

---

### Task 5: `<Sparkle>` particle burst

**Files:**
- Create: `app/src/delight/Sparkle.tsx`

- [ ] **Step 1: Viết `app/src/delight/Sparkle.tsx`**

```tsx
import type { CSSProperties } from 'react';

const PARTS = [
  { tx: '14px', ty: '-16px', bg: 'var(--status-green)', delay: '0s' },
  { tx: '-10px', ty: '-20px', bg: 'var(--status-amber)', delay: '.05s' },
  { tx: '18px', ty: '-2px', bg: '#7c5cff', delay: '.08s' },
  { tx: '-16px', ty: '-10px', bg: 'var(--status-green)', delay: '.04s' },
];

/** Burst 4 hạt nhỏ; render khi show=true (parent tự tắt sau SPARKLE_MS). */
export function Sparkle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="dl-sparkle" aria-hidden>
      {PARTS.map((p, i) => (
        <i
          key={i}
          style={{ '--tx': p.tx, '--ty': p.ty, background: p.bg, animationDelay: p.delay } as CSSProperties}
        />
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/delight/Sparkle.tsx
git commit -m "feat(delight): <Sparkle> particle burst"
```

---

### Task 6: Bọc `DelightProvider` + toggle Settings ở header

**Files:**
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Tạo nút toggle + bọc provider trong `app/src/App.tsx`**

Thay phần `return (...)` cuối (dòng 42–54) bằng:

```tsx
  return (
    <BudgetProvider budgetId={budget.budget_id}>
      <DelightProvider>
        <header className="mx-auto flex max-w-[980px] items-center justify-between px-3 pt-3">
          <span className="text-lg font-bold text-primary">WNAP</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{budget.budget_name}</span>
            <MotionToggle />
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Đăng xuất</Button>
          </div>
        </header>
        <AppTabs tab={tab} onChange={setTab} />
        {tab === 'plan' ? <PlanScreen /> : <LedgerScreen />}
      </DelightProvider>
    </BudgetProvider>
  );
}

function MotionToggle() {
  const { userEnabled, toggle } = useDelight();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      title={userEnabled ? 'Tắt hiệu ứng chuyển động' : 'Bật hiệu ứng chuyển động'}
      aria-pressed={userEnabled}
    >
      {userEnabled ? '✨ Hiệu ứng: Bật' : 'Hiệu ứng: Tắt'}
    </Button>
  );
}
```

Và thêm import ở đầu file (sau dòng `import { Button } ...`):
```tsx
import { DelightProvider, useDelight } from './delight/useDelight';
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat(delight): wrap DelightProvider + motion toggle in header"
```

---

### Task 7: Wire `RtaHeader` (payday bump/glow + assign emit + Count)

**Files:**
- Modify: `app/src/plan/RtaHeader.tsx` (thay toàn bộ file)

- [ ] **Step 1: Thay `app/src/plan/RtaHeader.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { cn } from '@/lib/utils';
import { Count } from '../delight/Count';
import { useDelight } from '../delight/useDelight';
import { usePrevious } from '../delight/usePrevious';
import { detectRtaSignal } from '../delight/signals';

export function RtaHeader({ onAssign }: { onAssign: () => void }) {
  const { rta } = useBudget();
  const { enabled } = useDelight();
  const tone = rta < 0 ? 'bg-status-red' : rta === 0 ? 'bg-status-gray' : 'bg-primary';

  const prevRta = usePrevious(rta);
  const [fx, setFx] = useState<'' | 'pay' | 'emit'>('');
  const timer = useRef(0);

  useEffect(() => {
    if (!enabled || prevRta === undefined) return;
    const sig = detectRtaSignal(prevRta, rta);
    if (sig === 'none') return;
    setFx(sig === 'payday' ? 'pay' : 'emit');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFx(''), 750);
    return () => clearTimeout(timer.current);
  }, [rta, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-full px-4 py-2 text-primary-foreground shadow-sm',
        tone,
        fx === 'pay' && 'dl-bump dl-glow',
        fx === 'emit' && 'dl-emit',
      )}
    >
      <span className="dl-ripple" aria-hidden />
      <span className="font-semibold">
        Sẵn sàng phân bổ: <Count value={rta} suffix="₫" />
      </span>
      <button onClick={onAssign} className="rounded-md bg-white/20 px-2 py-0.5 text-sm font-medium hover:bg-white/30">＋ Assign</button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/RtaHeader.tsx
git commit -m "feat(delight): RtaHeader payday bump/glow + assign emit + Count"
```

---

### Task 8: Tách `CategoryRow` khỏi `CategoryTable` (refactor thuần, không đổi hành vi)

**Files:**
- Modify: `app/src/plan/CategoryTable.tsx`

Lý do: per-row delight cần hook diff riêng cho từng dòng → tách mỗi dòng thành component để chứa hook. Task này **chỉ di chuyển JSX**, chưa thêm animation.

- [ ] **Step 1: Thay `app/src/plan/CategoryTable.tsx`**

```tsx
import { Fragment, useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AvailableBar } from './AvailableBar';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import type { PlanRow } from '../engine';

function AssignedCell({ row }: { row: PlanRow }) {
  const { setAssigned } = useBudget();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing) {
    return (
      <Input
        autoFocus value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => { setEditing(false); await setAssigned(row.categoryId, parseVnd(text)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="h-7 w-24 text-right"
      />
    );
  }
  return (
    <button onClick={() => { setText(String(row.assigned)); setEditing(true); }}
      className="cursor-text border-b border-dashed border-primary/40 text-primary tabular-nums">
      {formatVnd(row.assigned)}
    </button>
  );
}

function CategoryRow({ row, onMoveMoney, onEditTarget }: {
  row: PlanRow;
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}) {
  const { categoryName } = useBudget();
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 text-left">
        {categoryName(row.categoryId)}
        <button onClick={() => onEditTarget(row.categoryId)} title="Mục tiêu" className="ml-1.5 opacity-60 hover:opacity-100">🎯</button>
      </td>
      <td className="px-3 py-2 text-right"><AssignedCell row={row} /></td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatVnd(row.activity)}</td>
      <td className="px-3 py-2 text-right">
        <button onClick={() => onMoveMoney(row.categoryId)} title="Chuyển tiền" className="cursor-pointer"><AvailableBar row={row} /></button>
      </td>
    </tr>
  );
}

interface Props {
  visibleRows: PlanRow[];
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}

export function CategoryTable({ visibleRows, onMoveMoney, onEditTarget }: Props) {
  const { groups, groupIdOf } = useBudget();
  const byGroup = new Map<string, PlanRow[]>();
  for (const r of visibleRows) {
    const g = groupIdOf(r.categoryId);
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(r);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Category</th>
            <th className="px-3 py-2 text-right font-medium">Assigned</th>
            <th className="px-3 py-2 text-right font-medium">Activity</th>
            <th className="px-3 py-2 text-right font-medium">Available</th>
          </tr>
        </thead>
        <tbody>
          {groups.filter((g) => !g.isSystem).map((g) => {
            const rows = byGroup.get(g.id) ?? [];
            if (rows.length === 0) return null;
            return (
              <Fragment key={g.id}>
                <tr><td colSpan={4} className="bg-muted/60 px-3 py-1.5 font-semibold text-foreground/80">{g.name}</td></tr>
                {rows.map((r) => (
                  <CategoryRow key={r.categoryId} row={r} onMoveMoney={onMoveMoney} onEditTarget={onEditTarget} />
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + test (không đổi hành vi)**

Run: `npm run build && npm test -- --run`
Expected: build PASS; toàn bộ test PASS (94 + signals + gate).

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/CategoryTable.tsx
git commit -m "refactor(plan): extract CategoryRow from CategoryTable"
```

---

### Task 9: Delight cho `CategoryRow` + `AssignedCell` + `AvailableBar`

**Files:**
- Modify: `app/src/plan/CategoryTable.tsx` (thêm delight vào `CategoryRow` + `AssignedCell`)
- Modify: `app/src/plan/AvailableBar.tsx` (Count + transition màu)

- [ ] **Step 1: Thêm delight vào `AssignedCell` và `CategoryRow` trong `app/src/plan/CategoryTable.tsx`**

Thay 2 import đầu file:
```tsx
import { Fragment, useEffect, useRef, useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AvailableBar } from './AvailableBar';
import { formatVnd, parseVnd } from '../budget/format';
import { barFill } from '../budget/barFill';
import { STATUS_BAR_BG } from '../ui/statusColor';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Count } from '../delight/Count';
import { Sparkle } from '../delight/Sparkle';
import { useDelight } from '../delight/useDelight';
import { usePrevious } from '../delight/usePrevious';
import { detectRowSignal } from '../delight/signals';
import { SWEEP_MS, HEAL_MS, SPARKLE_MS } from '../delight/motion';
import type { PlanRow } from '../engine';
```

Trong `AssignedCell`, đổi nội dung nút hiển thị (nhánh không editing) từ `{formatVnd(row.assigned)}` sang `<Count>`:
```tsx
  return (
    <button onClick={() => { setText(String(row.assigned)); setEditing(true); }}
      className="cursor-text border-b border-dashed border-primary/40 text-primary tabular-nums">
      <Count value={row.assigned} />
    </button>
  );
```

Thay toàn bộ `CategoryRow` bằng:
```tsx
function CategoryRow({ row, onMoveMoney, onEditTarget }: {
  row: PlanRow;
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}) {
  const { categoryName } = useBudget();
  const { enabled } = useDelight();
  const { color } = barFill(row);
  const prevColor = usePrevious(color);
  const prevAssigned = usePrevious(row.assigned);

  const signal = prevColor === undefined
    ? 'none'
    : detectRowSignal({ color: prevColor, assigned: prevAssigned ?? row.assigned }, { color, assigned: row.assigned });

  const [receive, setReceive] = useState(false);
  const [heal, setHeal] = useState(false);
  const [spark, setSpark] = useState(false);
  const done = color === 'green';

  useEffect(() => {
    if (!enabled || signal === 'none') return;
    if (signal === 'assign') { setReceive(true); const t = setTimeout(() => setReceive(false), SWEEP_MS); return () => clearTimeout(t); }
    if (signal === 'cover') { setHeal(true); const t = setTimeout(() => setHeal(false), HEAL_MS); return () => clearTimeout(t); }
    if (signal === 'target-reached') { setSpark(true); const t = setTimeout(() => setSpark(false), SPARKLE_MS); return () => clearTimeout(t); }
  }, [signal, enabled]);

  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 text-left">
        <span className="inline-flex items-center gap-2">
          <span className={cn('dl-status', done && 'dl-done')}>
            <span className={cn('dl-dot', STATUS_BAR_BG[color])} />
            <svg viewBox="0 0 16 16"><path d="M4.5 8.3 L7 10.6 L11.5 5.6" /></svg>
            <Sparkle show={spark} />
          </span>
          {categoryName(row.categoryId)}
          <button onClick={() => onEditTarget(row.categoryId)} title="Mục tiêu" className="opacity-60 hover:opacity-100">🎯</button>
        </span>
      </td>
      <td className="px-3 py-2 text-right"><AssignedCell row={row} /></td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatVnd(row.activity)}</td>
      <td className={cn('relative px-3 py-2 text-right', receive && 'dl-receive', heal && 'dl-heal')}>
        <span className="dl-sweep" aria-hidden />
        <button onClick={() => onMoveMoney(row.categoryId)} title="Chuyển tiền" className="cursor-pointer"><AvailableBar row={row} /></button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Thêm `<Count>` + transition màu cho `app/src/plan/AvailableBar.tsx`**

```tsx
import { barFill } from '../budget/barFill';
import { STATUS_TEXT, STATUS_BAR_BG } from '../ui/statusColor';
import { cn } from '@/lib/utils';
import { Count } from '../delight/Count';
import type { PlanRow } from '../engine';

export function AvailableBar({ row }: { row: PlanRow }) {
  const { pct, color } = barFill(row);
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <span
          className={cn('block h-full rounded-full transition-[width,background-color] duration-700 ease-out', STATUS_BAR_BG[color])}
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className={cn('min-w-[80px] text-right font-semibold tabular-nums transition-colors duration-500', STATUS_TEXT[color])}>
        <Count value={row.available} />
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Verify build + test**

Run: `npm run build && npm test -- --run`
Expected: build PASS; tất cả test PASS.

- [ ] **Step 4: Commit**

```bash
git add app/src/plan/CategoryTable.tsx app/src/plan/AvailableBar.tsx
git commit -m "feat(delight): row signals — assign sweep, target tick+sparkle, cover heal, Count"
```

---

### Task 10: Verify e2e + reduced-motion + regression

**Files:** none (chỉ kiểm chứng)

- [ ] **Step 1: Build + full test regression**

Run: `npm run build && npm test -- --run`
Expected: build PASS; toàn bộ test PASS (94 cũ + signals 7 + gate 3 = 104).

- [ ] **Step 2: Chạy dev server + screenshot 4 khoảnh khắc**

Run: `npm run dev` (nền), mở `http://localhost:5173`, đăng nhập test account, sang tab Kế hoạch.
Dùng Playwright (hoặc thủ công) kiểm:
- Sửa Assigned 1 category đang vàng cho đủ target → quan sát: số Assigned/Available cuộn lên, chấm status → tick + sparkle (moment 2 + nền count-up).
- Assign cho 1 category xanh → vệt sáng nhận ở cột Available + RTA pill gợn sáng + số RTA tụt (moment 1).
- Move Money để bù 1 category đỏ về ≥0 → cột Available flash heal đỏ→trong (moment 3).
- Ledger: nhập 1 inflow vào "Ready to Assign" → RTA pill nảy + glow + số cuộn lên (moment 4).
Expected: 4 khoảnh khắc chạy đúng, layout không vỡ.

- [ ] **Step 3: Kiểm reduced-motion**

Bấm nút header "✨ Hiệu ứng: Bật" → "Hiệu ứng: Tắt", lặp lại thao tác assign.
Expected: số/màu đổi tức thì, KHÔNG có chuyển động/sparkle/sweep.
(Tuỳ chọn: Playwright `emulateMedia({ reducedMotion: 'reduce' })` → cũng không có animation dù setting bật.)

- [ ] **Step 4: Merge vào main**

```bash
git checkout main
git merge --no-ff feat/wnap-phase-3b-delight-layer -m "Merge Phase 3B: Delight Layer micro-animations"
git branch -d feat/wnap-phase-3b-delight-layer
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- 4 khoảnh khắc → moment 1 (T7 RTA emit + T9 receive sweep), moment 2 (T9 tick+sparkle), moment 3 (T9 heal), moment 4 (T7 payday bump/glow). ✓
- Nền count-up → `<Count>` (T4) dùng ở RTA (T7), Assigned + Available (T9). ✓
- Reduced-motion (OS + toggle) → T3 gate/provider + T6 toggle + CSS media query (T1). ✓
- Không đổi engine → chỉ thêm component/CSS; T8 refactor thuần; 94 test giữ nguyên (T8/T10 verify). ✓
- Mount đầu không bắn pháo hoa → `usePrevious` trả `undefined` lần đầu, signal='none' (T7/T9). ✓
- Token hoá → `motion.ts` + CSS var (T1). ✓
- Test pure (node env) → signals (T2) + gate (T3). ✓
- Verify e2e + build = type-check thật → T10. ✓

**Deviation so với spec (cố ý):** Spec ghi "Framer Motion làm lõi"; plan dùng **CSS keyframes + rAF, không thêm dependency**. Lý do: prototype (visual companion) đã đạt chất lượng mục tiêu thuần CSS+rAF; nhẹ hơn, gate reduced-motion đơn giản hơn. Có thể thêm framer-motion sau nếu muốn spring vật lý.

**Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh cụ thể. ✓
**Type consistency:** `detectRowSignal/detectRtaSignal` (T2) dùng đúng ở T7/T9; `RowSignal`/`RtaSignal` literal khớp; `STATUS_BAR_BG`/`STATUS_TEXT` (đã tồn tại) dùng đúng; `Count`/`Sparkle`/`useDelight`/`usePrevious` ký hiệu khớp giữa các task. ✓
