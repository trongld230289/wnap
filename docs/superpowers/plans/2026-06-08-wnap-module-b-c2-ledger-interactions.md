# WNAP Module B — C2: Ledger Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện Ledger: click icon đổi uncleared↔cleared, sửa/xóa giao dịch (soft-lock với reconciled), payee autocomplete, đối soát (reconcile), chuyển khoản giữa accounts (transfer).

**Architecture:** Thêm migration `0004_transfer.sql` (cột `transfer_id`). Mở rộng `useBudget` với mutations `setTxStatus`/`updateTransaction`/`deleteTransaction`/`reconcileAccount`/`addTransfer`. Component: TransactionForm thêm chế độ sửa + datalist payee; TransactionTable thêm toggle/sửa/xóa; `ReconcileModal`, `TransferForm` mới; BalanceHeader thêm nút Đối soát. Mutation = ghi Supabase rồi refetch (Plan screen cũng tự cập nhật). UI trần — polish Phase 3.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, @supabase/supabase-js. Tiền VND (âm=outflow, dương=inflow).

**Spec:** `docs/superpowers/specs/2026-06-08-wnap-module-b-ledger-design.md` (§3 transfer, §6 reconcile/soft-lock).

**Prerequisite:** C1 (Ledger foundation) đã merged. `useBudget` (C1), `ledger/*`, `plan/Modal.tsx`, `format.ts` đã có. Mọi lệnh trong `app/`.

---

## File Structure

```
supabase/migrations/0004_transfer.sql   ← cột transfer_id (Task 1, NEW)
app/src/
  budget/useBudget.tsx                   ← select transfer_id + 5 mutations (Task 1+2, MODIFY)
  ledger/
    TransactionForm.tsx                  ← chế độ sửa + payee datalist (Task 3, MODIFY toàn bộ)
    TransactionTable.tsx                 ← toggle/sửa/xóa (Task 4, MODIFY toàn bộ)
    ReconcileModal.tsx                   ← (Task 5, NEW)
    TransferForm.tsx                     ← (Task 5, NEW)
    BalanceHeader.tsx                    ← nút Đối soát (Task 6, MODIFY toàn bộ)
    LedgerScreen.tsx                     ← wiring (Task 6, MODIFY toàn bộ)
```

Test: `npx vitest run` ; type-check: `npx tsc --noEmit`. (C2 chủ yếu mutations + UI → verify bằng tsc; logic thuần đã test ở C1.)

---

### Task 1: Migration transfer_id + useBudget select

**Files:**
- Create: `supabase/migrations/0004_transfer.sql`
- Modify: `app/src/budget/useBudget.tsx` (1 dòng select)

- [ ] **Step 1: Tạo `supabase/migrations/0004_transfer.sql`:**

```sql
-- Liên kết 2 dòng của 1 transfer giữa account (Module B C2)
alter table transactions add column if not exists transfer_id uuid;
create index if not exists idx_transactions_transfer on transactions (transfer_id);
```

- [ ] **Step 2: Apply migration (MANUAL).** Mở Supabase → SQL Editor → paste nội dung file trên → Run. Kỳ vọng "Success. No rows returned". (Người điều phối/người dùng làm; subagent KHÔNG cần — bước này chỉ ảnh hưởng runtime, không ảnh hưởng tsc/test.)

- [ ] **Step 3: Sửa select transactions** trong `app/src/budget/useBudget.tsx` — thay dòng:

```tsx
    supabase.from('transactions').select('id,account_id,date,category_id,amount,status,payee_id,memo').eq('budget_id', budgetId).order('date', { ascending: false }),
```

thành (thêm `,transfer_id`):

```tsx
    supabase.from('transactions').select('id,account_id,date,category_id,amount,status,payee_id,memo,transfer_id').eq('budget_id', budgetId).order('date', { ascending: false }),
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → exit 0. `npx vitest run` → 94 pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_transfer.sql app/src/budget/useBudget.tsx
git commit -m "feat(ledger): add transfer_id migration and select it in useBudget"
```

---

### Task 2: useBudget — setTxStatus / updateTransaction / deleteTransaction / reconcileAccount / addTransfer

**Files:**
- Modify: `app/src/budget/useBudget.tsx`

- [ ] **Step 1: Thêm 5 signature vào interface `BudgetCtx`** — ngay sau dòng `addTransaction: (t: NewTransaction) => Promise<void>;`:

```tsx
  setTxStatus: (id: string, status: 'cleared' | 'uncleared') => Promise<void>;
  updateTransaction: (id: string, patch: { date?: string; payeeId?: string | null; categoryId?: string | null; memo?: string | null; amount?: number }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  reconcileAccount: (accountId: string) => Promise<void>;
  addTransfer: (fromId: string, toId: string, amount: number, date: string) => Promise<void>;
```

- [ ] **Step 2: Thêm 5 mutation** — ngay TRƯỚC dòng `const value: BudgetCtx = {`:

```tsx
  const setTxStatus = useCallback(async (id: string, status: 'cleared' | 'uncleared') => {
    await supabase.from('transactions').update({ status }).eq('id', id);
    await refetch();
  }, [refetch]);

  const updateTransaction = useCallback(async (id: string, patch: { date?: string; payeeId?: string | null; categoryId?: string | null; memo?: string | null; amount?: number }) => {
    const row: Record<string, unknown> = {};
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.payeeId !== undefined) row.payee_id = patch.payeeId;
    if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
    if (patch.memo !== undefined) row.memo = patch.memo;
    if (patch.amount !== undefined) row.amount = patch.amount;
    await supabase.from('transactions').update(row).eq('id', id);
    await refetch();
  }, [refetch]);

  const deleteTransaction = useCallback(async (id: string) => {
    const r = raw.transactions.find((t) => t.id === id);
    if (r?.transfer_id) await supabase.from('transactions').delete().eq('transfer_id', r.transfer_id);
    else await supabase.from('transactions').delete().eq('id', id);
    await refetch();
  }, [raw, refetch]);

  const reconcileAccount = useCallback(async (accountId: string) => {
    await supabase.from('transactions').update({ status: 'reconciled' }).eq('account_id', accountId).eq('status', 'cleared');
    await supabase.from('accounts').update({ reconciled_at: new Date().toISOString() }).eq('id', accountId);
    await refetch();
  }, [refetch]);

  const addTransfer = useCallback(async (fromId: string, toId: string, amount: number, date: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const transferId = crypto.randomUUID();
    await supabase.from('transactions').insert([
      { budget_id: budgetId, account_id: fromId, date, category_id: null, payee_id: null, memo: null, amount: -amount, status: 'uncleared', created_by: authData.user?.id, transfer_id: transferId },
      { budget_id: budgetId, account_id: toId, date, category_id: null, payee_id: null, memo: null, amount, status: 'uncleared', created_by: authData.user?.id, transfer_id: transferId },
    ]);
    await refetch();
  }, [budgetId, refetch]);
```

- [ ] **Step 3: Thêm vào object `value`** — sau `addAccount, upsertPayee, addTransaction,`:

```tsx
    setTxStatus, updateTransaction, deleteTransaction, reconcileAccount, addTransfer,
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → exit 0. `npx vitest run` → 94 pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/budget/useBudget.tsx
git commit -m "feat(ledger): add status/edit/delete/reconcile/transfer mutations"
```

---

### Task 3: TransactionForm — chế độ sửa + payee autocomplete

**Files:**
- Modify (thay TOÀN BỘ): `app/src/ledger/TransactionForm.tsx`

- [ ] **Step 1: Thay toàn bộ `app/src/ledger/TransactionForm.tsx`:**

```tsx
import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import type { LedgerTxn } from '../lib/mappers';

const inp: React.CSSProperties = { border: '1px solid #cfd8d2', borderRadius: 5, padding: '5px 7px', fontSize: 12 };

export function TransactionForm({ accountId, editing, onDone }: { accountId: string; editing: LedgerTxn | null; onDone: () => void }) {
  const { allCategories, payees, upsertPayee, addTransaction, updateTransaction } = useBudget();
  const today = new Date().toISOString().slice(0, 10);
  const payeeName0 = editing?.payeeId ? payees.find((p) => p.id === editing.payeeId)?.name ?? '' : '';
  const [date, setDate] = useState(editing?.date ?? today);
  const [payee, setPayee] = useState(payeeName0);
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [outflow, setOutflow] = useState(editing && editing.amount < 0 ? formatVnd(-editing.amount) : '');
  const [inflow, setInflow] = useState(editing && editing.amount > 0 ? formatVnd(editing.amount) : '');

  async function save() {
    const out = parseVnd(outflow);
    const inn = parseVnd(inflow);
    const amount = inn > 0 ? inn : -out;
    if (amount === 0) { window.alert('Nhập Outflow hoặc Inflow'); return; }
    const payeeId = payee.trim() ? await upsertPayee(payee) : null;
    const patch = { date, payeeId, categoryId: categoryId || null, memo: memo.trim() || null, amount };
    if (editing) await updateTransaction(editing.id, patch);
    else await addTransaction({ accountId, ...patch });
    onDone();
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: '#fbfdfb', padding: 8, borderRadius: 8, border: '1px solid #e6efe8', marginBottom: 8 }}>
      <input style={{ ...inp, width: 120 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input style={{ ...inp, width: 130 }} placeholder="Payee" list="payee-list" value={payee} onChange={(e) => setPayee(e.target.value)} />
      <datalist id="payee-list">{payees.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <select style={{ ...inp, width: 160 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">— Chọn category —</option>
        {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input style={{ ...inp, width: 120 }} placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Outflow" value={outflow} onChange={(e) => setOutflow(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Inflow" value={inflow} onChange={(e) => setInflow(e.target.value)} />
      <button onClick={save} style={{ background: '#1f9d55', color: '#fff', border: 0, borderRadius: 5, padding: '5px 12px' }}>{editing ? 'Cập nhật' : 'Lưu'}</button>
      <button onClick={onDone} style={{ border: 0, background: 'none', color: '#888' }}>Hủy</button>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`. Expected: lỗi DUY NHẤT ở `LedgerScreen.tsx`/`TransactionTable.tsx` vì prop `editing`/`onEdit`/`onDelete` chưa khớp (sẽ vá ở Task 4, 6). KHÔNG commit riêng — làm tiếp Task 4–6 rồi commit chung ở Task 6.

> **Lưu ý người thực thi:** Task 3–6 đổi prop liên thông (TransactionForm thêm `editing`; TransactionTable thêm `onEdit/onDelete`; LedgerScreen truyền hết). `tsc` chỉ sạch khi xong cả Task 3, 4, 5, 6. Làm liền rồi commit MỘT lần ở Task 6.

---

### Task 4: TransactionTable — toggle trạng thái + sửa/xóa

**Files:**
- Modify (thay TOÀN BỘ): `app/src/ledger/TransactionTable.tsx`

- [ ] **Step 1: Thay toàn bộ `app/src/ledger/TransactionTable.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import type { LedgerTxn } from '../lib/mappers';

const STATUS_ICON: Record<string, string> = { uncleared: '○', cleared: 'C', reconciled: '🔒' };

export function TransactionTable({ txns, onEdit, onDelete }: { txns: LedgerTxn[]; onEdit: (t: LedgerTxn) => void; onDelete: (t: LedgerTxn) => void }) {
  const { categoryName, accountName, payees, setTxStatus } = useBudget();
  const payeeName = (id: string | null) => (id ? payees.find((p) => p.id === id)?.name ?? '' : '');

  function toggle(t: LedgerTxn) {
    if (t.status === 'reconciled') { window.alert('Giao dịch đã đối soát (đã khóa).'); return; }
    setTxStatus(t.id, t.status === 'uncleared' ? 'cleared' : 'uncleared');
  }

  const th: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: '#999', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #eee' };
  const td: React.CSSProperties = { padding: '7px 8px', borderBottom: '1px solid #f3f3f3' };
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr><th style={th}></th><th style={th}>Ngày</th><th style={th}>Payee</th><th style={th}>Category</th><th style={th}>Memo</th><th style={{ ...th, textAlign: 'right' }}>Outflow</th><th style={{ ...th, textAlign: 'right' }}>Inflow</th><th style={th}></th></tr>
      </thead>
      <tbody>
        {txns.map((t) => (
          <tr key={t.id}>
            <td style={{ ...td, cursor: 'pointer', color: t.status === 'uncleared' ? '#bbb' : '#1f9d55' }} onClick={() => toggle(t)} title="Đổi trạng thái">{STATUS_ICON[t.status]}</td>
            <td style={td}>{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</td>
            <td style={td}>{t.transferId ? `⇄ ${accountName(t.accountId)}` : payeeName(t.payeeId)}</td>
            <td style={{ ...td, color: t.categoryId ? '#1f7d45' : '#999' }}>{t.categoryId ? categoryName(t.categoryId) : '(Transfer)'}</td>
            <td style={{ ...td, color: '#888' }}>{t.memo}</td>
            <td style={num}>{t.amount < 0 ? formatVnd(-t.amount) : ''}</td>
            <td style={{ ...num, color: '#1f9d55' }}>{t.amount > 0 ? formatVnd(t.amount) : ''}</td>
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
              {!t.transferId && <button onClick={() => onEdit(t)} title="Sửa" style={{ border: 0, background: 'none', cursor: 'pointer' }}>✏️</button>}
              <button onClick={() => onDelete(t)} title="Xóa" style={{ border: 0, background: 'none', cursor: 'pointer' }}>🗑️</button>
            </td>
          </tr>
        ))}
        {txns.length === 0 && <tr><td colSpan={8} style={{ ...td, color: '#aaa', textAlign: 'center' }}>Chưa có giao dịch</td></tr>}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` (vẫn còn lỗi ở LedgerScreen tới Task 6). KHÔNG commit riêng.

---

### Task 5: ReconcileModal + TransferForm

**Files:**
- Create: `app/src/ledger/ReconcileModal.tsx`, `app/src/ledger/TransferForm.tsx`

- [ ] **Step 1: Implement `app/src/ledger/ReconcileModal.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from '../plan/Modal';
import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd, parseVnd } from '../budget/format';

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '6px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function ReconcileModal({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const { transactions, accountName, reconcileAccount } = useBudget();
  const cleared = balances(transactions.filter((t) => t.accountId === accountId)).cleared;
  const [bank, setBank] = useState(formatVnd(cleared));
  const diff = parseVnd(bank) - cleared;

  async function confirm() {
    await reconcileAccount(accountId);
    onClose();
  }

  return (
    <Modal title={`Đối soát · ${accountName(accountId)}`} onClose={onClose}>
      <div style={{ fontSize: 13 }}>Cleared (theo app): <b>{formatVnd(cleared)}₫</b></div>
      <label style={{ fontSize: 11, color: '#999' }}>Số dư thực ở ngân hàng</label>
      <input style={inp} value={bank} onChange={(e) => setBank(e.target.value)} />
      <div style={{ fontSize: 13, color: diff === 0 ? '#1f9d55' : '#caa007' }}>
        Chênh lệch: {formatVnd(diff)}₫ {diff === 0 ? '✓ khớp' : '(kiểm tra lại giao dịch nếu cần)'}
      </div>
      <button onClick={confirm} style={{ marginTop: 12, width: '100%', background: '#2b6cb0', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Xác nhận đối soát (khóa cleared)</button>
    </Modal>
  );
}
```

- [ ] **Step 2: Implement `app/src/ledger/TransferForm.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from '../plan/Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd } from '../budget/format';

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '6px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function TransferForm({ fromId, onClose }: { fromId: string; onClose: () => void }) {
  const { accounts, accountName, addTransfer } = useBudget();
  const others = accounts.filter((a) => a.id !== fromId);
  const today = new Date().toISOString().slice(0, 10);
  const [toId, setToId] = useState(others[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  async function go() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (!toId) { window.alert('Chọn tài khoản đích'); return; }
    await addTransfer(fromId, toId, amt, date);
    onClose();
  }

  return (
    <Modal title="Chuyển khoản giữa tài khoản" onClose={onClose}>
      <label style={{ fontSize: 11, color: '#999' }}>Từ</label>
      <div style={{ ...inp, background: '#f6f6f8' }}>{accountName(fromId)}</div>
      <label style={{ fontSize: 11, color: '#999' }}>Đến</label>
      <select style={inp} value={toId} onChange={(e) => setToId(e.target.value)}>
        {others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <label style={{ fontSize: 11, color: '#999' }}>Số tiền</label>
      <input style={inp} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 2.000.000" />
      <label style={{ fontSize: 11, color: '#999' }}>Ngày</label>
      <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button onClick={go} style={{ marginTop: 8, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Chuyển</button>
    </Modal>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (vẫn lỗi LedgerScreen tới Task 6). KHÔNG commit riêng.

---

### Task 6: BalanceHeader (nút Đối soát) + LedgerScreen wiring + commit chung

**Files:**
- Modify (thay TOÀN BỘ): `app/src/ledger/BalanceHeader.tsx`, `app/src/ledger/LedgerScreen.tsx`

- [ ] **Step 1: Thay toàn bộ `app/src/ledger/BalanceHeader.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd } from '../budget/format';

export function BalanceHeader({ accountId, onReconcile }: { accountId: string; onReconcile: () => void }) {
  const { accounts, transactions, accountName } = useBudget();
  const txns = accountId === 'all' ? transactions : transactions.filter((t) => t.accountId === accountId);
  const b = balances(txns);
  const title = accountId === 'all' ? 'Tất cả tài khoản' : accountName(accountId);
  const acc = accounts.find((a) => a.id === accountId);
  const recLabel = (() => {
    if (accountId === 'all' || !acc?.reconciledAt) return 'Chưa đối soát';
    const days = Math.floor((Date.now() - new Date(acc.reconciledAt).getTime()) / 86_400_000);
    return `Đối soát ${days} ngày trước`;
  })();

  const cell = (lab: string, v: number, color: string) => (
    <div style={{ flex: 1, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>{lab}</div>
      <div style={{ fontWeight: 700, color }}>{formatVnd(v)}₫</div>
    </div>
  );
  const op = (s: string) => <div style={{ alignSelf: 'center', color: '#bbb', padding: '0 4px' }}>{s}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div><span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{recLabel}</span></div>
        {accountId !== 'all' && <button onClick={onReconcile} style={{ background: '#2b6cb0', color: '#fff', border: 0, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>⚖ Đối soát</button>}
      </div>
      <div style={{ display: 'flex', border: '1px solid #eee', borderRadius: 8, marginBottom: 10 }}>
        {cell('Cleared', b.cleared, '#333')}{op('＋')}{cell('Uncleared', b.uncleared, '#caa007')}{op('＝')}{cell('Working', b.working, '#1f9d55')}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Thay toàn bộ `app/src/ledger/LedgerScreen.tsx`:**

```tsx
import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AccountSidebar } from './AccountSidebar';
import { BalanceHeader } from './BalanceHeader';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';
import { ReconcileModal } from './ReconcileModal';
import { TransferForm } from './TransferForm';
import type { LedgerTxn } from '../lib/mappers';

export function LedgerScreen() {
  const { loading, accounts, transactions, deleteTransaction } = useBudget();
  const [selected, setSelected] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LedgerTxn | null>(null);
  const [modal, setModal] = useState<'reconcile' | 'transfer' | null>(null);

  if (loading) return <p style={{ fontFamily: 'sans-serif', margin: 40 }}>Đang tải sổ giao dịch…</p>;

  const txns = selected === 'all' ? transactions : transactions.filter((t) => t.accountId === selected);
  const canAdd = selected !== 'all';

  function reset() { setAdding(false); setEditing(null); }
  function onEdit(t: LedgerTxn) {
    if (t.status === 'reconciled' && !window.confirm('Giao dịch đã đối soát, sửa có thể làm lệch số dư ngân hàng. Tiếp tục?')) return;
    setAdding(false); setEditing(t);
  }
  async function onDelete(t: LedgerTxn) {
    if (t.status === 'reconciled' && !window.confirm('Giao dịch đã đối soát, xóa có thể làm lệch số dư. Tiếp tục?')) return;
    if (!window.confirm('Xóa giao dịch này?')) return;
    await deleteTransaction(t.id);
  }

  return (
    <div style={{ maxWidth: 980, margin: '12px auto', fontFamily: 'sans-serif', padding: '0 12px' }}>
      <div style={{ display: 'flex', border: '1px solid #e3e3e6', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        <AccountSidebar selected={selected} onSelect={(id) => { setSelected(id); reset(); }} />
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <BalanceHeader accountId={selected} onReconcile={() => setModal('reconcile')} />
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            {canAdd ? (
              <>
                <button onClick={() => { setEditing(null); setAdding(true); }} disabled={adding}>＋ Thêm giao dịch</button>
                <button onClick={() => setModal('transfer')}>⇄ Chuyển khoản</button>
              </>
            ) : <span style={{ fontSize: 12, color: '#aaa' }}>Chọn 1 tài khoản để thêm giao dịch{accounts.length === 0 ? ' (tạo tài khoản trước)' : ''}</span>}
          </div>
          {(adding || editing) && canAdd && <TransactionForm accountId={selected} editing={editing} onDone={reset} />}
          <TransactionTable txns={txns} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      {modal === 'reconcile' && canAdd && <ReconcileModal accountId={selected} onClose={() => setModal(null)} />}
      {modal === 'transfer' && canAdd && <TransferForm fromId={selected} onClose={() => setModal(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → exit 0 (giờ mọi prop khớp). `npx vitest run` → 94 pass.

- [ ] **Step 4: Commit (gộp Task 3–6)**

```bash
git add app/src/ledger
git commit -m "feat(ledger): add status toggle, edit/delete, reconcile, transfer, payee autocomplete"
```

---

### Task 7: End-to-end verify (Playwright) + chốt

**Files:** không tạo file. **Trước khi chạy: migration 0004 phải đã apply (Task 1 Step 2).** Tài khoản Phase 0, budget có account "Vietcombank" + giao dịch từ C1.

- [ ] **Step 1:** `npm run dev`, đăng nhập, tab **Sổ giao dịch**, chọn Vietcombank.

- [ ] **Step 2: Toggle trạng thái** — click icon ○ của 1 giao dịch → thành **C** (Cleared tăng, Uncleared giảm tương ứng ở header). Click lại → về ○.

- [ ] **Step 3: Sửa** — bấm ✏️ 1 giao dịch outflow → form prefill → đổi số/category → **Cập nhật** → bảng + (nếu đổi category) Plan screen activity đổi theo.

- [ ] **Step 4: Payee autocomplete** — ＋ Thêm giao dịch → gõ vào Payee thấy gợi ý payee cũ (datalist).

- [ ] **Step 5: Transfer** — tạo thêm account "Sổ tiết kiệm" (Savings) → ở Vietcombank bấm **⇄ Chuyển khoản** → đích Sổ tiết kiệm, 2.000.000 → Chuyển. Vietcombank có dòng outflow `⇄`, Sổ tiết kiệm có inflow; **RTA/Activity Plan KHÔNG đổi** (transfer category null).

- [ ] **Step 6: Reconcile + soft-lock** — set vài giao dịch về **C** → bấm **⚖ Đối soát** → modal hiện Cleared + nhập số dư → Xác nhận → các C thành **🔒**; "Đối soát 0 ngày trước". Bấm ✏️ dòng 🔒 → hiện **cảnh báo soft-lock**.

- [ ] **Step 7: Xóa** — 🗑️ 1 giao dịch thường → confirm → biến mất; xóa 1 dòng transfer → cả cặp biến mất.

- [ ] **Step 8:** Không lỗi console đỏ. Dừng dev server.

---

## C2 hoàn thành khi

- [ ] `npm test` PASS (94), `npx tsc --noEmit` exit 0.
- [ ] Migration `0004_transfer.sql` đã apply.
- [ ] Toggle uncleared↔cleared; sửa/xóa giao dịch (xóa transfer xóa cả cặp).
- [ ] Payee autocomplete; reconcile khóa cleared→reconciled + soft-lock cảnh báo khi sửa.
- [ ] Transfer ghi 2 dòng liên kết, không ảnh hưởng budget math.
- [ ] **Module B (Ledger) hoàn chỉnh → Phase 2 XONG.** Tiếp theo: Phase 3 (polish UI design skills + Delight Layer, realtime sync, Action Log).
```
