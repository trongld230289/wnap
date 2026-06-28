import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from './useRealtime';
import { debounce } from './debounce';
import { mapActionLog } from './actionLog';
import type { RawActionLog, BudgetMember, ActionLogEntry } from './actionLog';
import { computeThrough, buildPlanRows, monthOf } from '../engine';
import type { Month, PlanRow, Proposal, MonthSummary, TargetStrategy, TargetCadence } from '../engine';
import { toBudgetInput, deriveFirstMonth, mapAccounts, mapPayees, mapLedgerTxns } from '../lib/mappers';
import type { RawBudgetData, RawAccount, RawPayee, LedgerAccount, LedgerPayee, LedgerTxn, AccountType } from '../lib/mappers';

export interface TargetInput {
  strategy: TargetStrategy;
  amount: number;
  cadence: TargetCadence;
  dueDay: number | null;
  dueWeekday: number | null;
  dueDate: string | null;
}

export interface NewTransaction {
  accountId: string;
  date: string;
  payeeId: string | null;
  categoryId: string | null;
  memo: string | null;
  amount: number;
}

interface BudgetCtx {
  loading: boolean;
  viewMonth: Month;
  setViewMonth: (m: Month) => void;
  rows: PlanRow[];
  rta: number;
  summaries: Map<Month, MonthSummary>;
  firstMonth: Month;
  groups: { id: string; name: string; isSystem: boolean }[];
  allCategories: { id: string; name: string; isSystem: boolean }[];
  accounts: LedgerAccount[];
  payees: LedgerPayee[];
  transactions: LedgerTxn[];
  recentMoves: ActionLogEntry[];
  categoryName: (id: string) => string;
  accountName: (id: string) => string;
  groupIdOf: (categoryId: string) => string;
  refetch: () => Promise<void>;
  setAssigned: (categoryId: string, amount: number) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  archiveGroup: (groupId: string) => Promise<{ ok: boolean; reason?: 'not-empty' }>;
  addCategory: (groupId: string, name: string, kind: string) => Promise<void>;
  renameCategory: (categoryId: string, name: string) => Promise<void>;
  archiveCategory: (categoryId: string) => Promise<void>;
  setTarget: (categoryId: string, t: TargetInput) => Promise<void>;
  removeTarget: (categoryId: string) => Promise<void>;
  setSnooze: (categoryId: string, snoozed: boolean) => Promise<void>;
  moveMoney: (fromId: string, toId: string, amount: number) => Promise<void>;
  applyProposals: (proposals: Proposal[]) => Promise<void>;
  addAccount: (name: string, type: AccountType) => Promise<void>;
  upsertPayee: (name: string) => Promise<string | null>;
  addTransaction: (t: NewTransaction) => Promise<void>;
  setTxStatus: (id: string, status: 'cleared' | 'uncleared') => Promise<void>;
  updateTransaction: (id: string, patch: { date?: string; payeeId?: string | null; categoryId?: string | null; memo?: string | null; amount?: number }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  reconcileAccount: (accountId: string) => Promise<void>;
  addTransfer: (fromId: string, toId: string, amount: number, date: string) => Promise<void>;
}

const Ctx = createContext<BudgetCtx | null>(null);

interface FetchResult {
  raw: RawBudgetData;
  groups: BudgetCtx['groups'];
  accounts: RawAccount[];
  payees: RawPayee[];
  actionLog: RawActionLog[];
  members: BudgetMember[];
}

async function fetchRaw(budgetId: string): Promise<FetchResult> {
  const [g, c, t, s, a, tx, acc, pay, al, mem] = await Promise.all([
    supabase.from('category_groups').select('id,name,is_system,sort_order').eq('budget_id', budgetId).eq('archived', false).order('sort_order'),
    supabase.from('categories').select('id,group_id,name,kind,is_system,sort_order').eq('budget_id', budgetId).eq('archived', false).order('sort_order'),
    supabase.from('targets').select('category_id,strategy,amount,cadence,due_day,due_weekday,due_date').eq('budget_id', budgetId),
    supabase.from('target_snoozes').select('category_id,month').eq('budget_id', budgetId),
    supabase.from('assignments').select('category_id,month,assigned').eq('budget_id', budgetId),
    supabase.from('transactions').select('id,account_id,date,category_id,amount,status,payee_id,memo,transfer_id').eq('budget_id', budgetId).order('date', { ascending: false }),
    supabase.from('accounts').select('id,name,type,reconciled_at,sort_order').eq('budget_id', budgetId).eq('closed', false).order('sort_order'),
    supabase.from('payees').select('id,name').eq('budget_id', budgetId),
    supabase.from('action_log').select('id,user_id,entity_ref,old_value,new_value,created_at').eq('budget_id', budgetId).order('created_at', { ascending: false }).limit(50),
    supabase.from('budget_members').select('user_id,display_name').eq('budget_id', budgetId),
  ]);
  return {
    raw: {
      categories: (c.data ?? []) as RawBudgetData['categories'],
      targets: (t.data ?? []) as RawBudgetData['targets'],
      snoozes: (s.data ?? []) as RawBudgetData['snoozes'],
      assignments: (a.data ?? []) as RawBudgetData['assignments'],
      transactions: (tx.data ?? []) as RawBudgetData['transactions'],
    },
    groups: (g.data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, isSystem: r.is_system as boolean })),
    accounts: (acc.data ?? []) as RawAccount[],
    payees: (pay.data ?? []) as RawPayee[],
    actionLog: (al.data ?? []) as RawActionLog[],
    members: (mem.data ?? []) as BudgetMember[],
  };
}

export function BudgetProvider({ budgetId, children }: { budgetId: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawBudgetData>({ categories: [], targets: [], snoozes: [], assignments: [], transactions: [] });
  const [groups, setGroups] = useState<BudgetCtx['groups']>([]);
  const [rawAccounts, setRawAccounts] = useState<RawAccount[]>([]);
  const [rawPayees, setRawPayees] = useState<RawPayee[]>([]);
  const [rawActionLog, setRawActionLog] = useState<RawActionLog[]>([]);
  const [members, setMembers] = useState<BudgetMember[]>([]);
  const [viewMonth, setViewMonth] = useState<Month>(monthOf(new Date().toISOString()));

  const refetch = useCallback(async () => {
    const r = await fetchRaw(budgetId);
    setRaw(r.raw);
    setGroups(r.groups);
    setRawAccounts(r.accounts);
    setRawPayees(r.payees);
    setRawActionLog(r.actionLog);
    setMembers(r.members);
    setLoading(false);
  }, [budgetId]);

  useEffect(() => { refetch(); }, [refetch]);

  const scheduleRefetch = useMemo(() => debounce(() => { void refetch(); }, 400), [refetch]);
  useRealtime(budgetId, scheduleRefetch);
  useEffect(() => () => scheduleRefetch.cancel(), [scheduleRefetch]);

  const { rows, rta, summaries, firstMonth } = useMemo(() => {
    const dataFirst = deriveFirstMonth(raw, viewMonth);
    const firstMonth = viewMonth < dataFirst ? viewMonth : dataFirst;
    const input = toBudgetInput(raw, firstMonth);
    const summaries = computeThrough(input, viewMonth);
    return {
      rows: buildPlanRows(input, summaries, viewMonth),
      rta: summaries.get(viewMonth)?.rta ?? 0,
      summaries, firstMonth,
    };
  }, [raw, viewMonth]);

  const nameById = useMemo(() => new Map(raw.categories.map((c) => [c.id, c.name])), [raw]);
  const groupById = useMemo(() => new Map(raw.categories.map((c) => [c.id, c.group_id])), [raw]);
  const accounts = useMemo(() => mapAccounts(rawAccounts), [rawAccounts]);
  const payees = useMemo(() => mapPayees(rawPayees), [rawPayees]);
  const transactions = useMemo(() => mapLedgerTxns(raw.transactions), [raw]);
  const recentMoves = useMemo(() => mapActionLog(rawActionLog, members), [rawActionLog, members]);
  const allCategories = useMemo(() => raw.categories.map((c) => ({ id: c.id, name: c.name, isSystem: c.is_system })), [raw]);
  const accNameById = useMemo(() => new Map(rawAccounts.map((a) => [a.id, a.name])), [rawAccounts]);

  const setAssigned = useCallback(async (categoryId: string, amount: number) => {
    await supabase.from('assignments').upsert({ budget_id: budgetId, category_id: categoryId, month: viewMonth, assigned: amount }, { onConflict: 'category_id,month' });
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const addGroup = useCallback(async (name: string) => {
    await supabase.from('category_groups').insert({ budget_id: budgetId, name });
    await refetch();
  }, [budgetId, refetch]);

  const renameGroup = useCallback(async (groupId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await supabase.from('category_groups').update({ name: trimmed }).eq('id', groupId).eq('budget_id', budgetId);
    await refetch();
  }, [budgetId, refetch]);

  const addCategory = useCallback(async (groupId: string, name: string, kind: string) => {
    await supabase.from('categories').insert({ budget_id: budgetId, group_id: groupId, name, kind });
    await refetch();
  }, [budgetId, refetch]);

  const renameCategory = useCallback(async (categoryId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await supabase.from('categories').update({ name: trimmed }).eq('id', categoryId).eq('budget_id', budgetId);
    await refetch();
  }, [budgetId, refetch]);

  const archiveCategory = useCallback(async (categoryId: string) => {
    await supabase.from('categories').update({ archived: true }).eq('id', categoryId).eq('budget_id', budgetId);
    await refetch();
  }, [budgetId, refetch]);

  const archiveGroup = useCallback(async (groupId: string): Promise<{ ok: boolean; reason?: 'not-empty' }> => {
    const hasActive = raw.categories.some((c) => c.group_id === groupId && !c.is_system);
    if (hasActive) return { ok: false, reason: 'not-empty' };
    await supabase.from('category_groups').update({ archived: true }).eq('id', groupId).eq('budget_id', budgetId);
    await refetch();
    return { ok: true };
  }, [budgetId, raw, refetch]);

  const setTarget = useCallback(async (categoryId: string, t: TargetInput) => {
    await supabase.from('targets').upsert({ budget_id: budgetId, category_id: categoryId, strategy: t.strategy, amount: t.amount, cadence: t.cadence, due_day: t.dueDay, due_weekday: t.dueWeekday, due_date: t.dueDate }, { onConflict: 'category_id' });
    await refetch();
  }, [budgetId, refetch]);

  const removeTarget = useCallback(async (categoryId: string) => {
    await supabase.from('targets').delete().eq('budget_id', budgetId).eq('category_id', categoryId);
    await refetch();
  }, [budgetId, refetch]);

  const setSnooze = useCallback(async (categoryId: string, snoozed: boolean) => {
    if (snoozed) {
      await supabase.from('target_snoozes').upsert({ budget_id: budgetId, category_id: categoryId, month: viewMonth }, { onConflict: 'category_id,month', ignoreDuplicates: true });
    } else {
      await supabase.from('target_snoozes').delete().eq('category_id', categoryId).eq('month', viewMonth);
    }
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const moveMoney = useCallback(async (fromId: string, toId: string, amount: number) => {
    const assignedNow = (id: string) => raw.assignments.find((a) => a.category_id === id && a.month === viewMonth)?.assigned ?? 0;
    await supabase.from('assignments').upsert([
      { budget_id: budgetId, category_id: fromId, month: viewMonth, assigned: assignedNow(fromId) - amount },
      { budget_id: budgetId, category_id: toId, month: viewMonth, assigned: assignedNow(toId) + amount },
    ], { onConflict: 'category_id,month' });
    await refetch();
  }, [budgetId, viewMonth, raw, refetch]);

  const applyProposals = useCallback(async (proposals: Proposal[]) => {
    if (proposals.length === 0) return;
    await supabase.from('assignments').upsert(proposals.map((p) => ({ budget_id: budgetId, category_id: p.categoryId, month: viewMonth, assigned: p.newAssigned })), { onConflict: 'category_id,month' });
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const addAccount = useCallback(async (name: string, type: AccountType) => {
    await supabase.from('accounts').insert({ budget_id: budgetId, name, type });
    await refetch();
  }, [budgetId, refetch]);

  const upsertPayee = useCallback(async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = rawPayees.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const { data } = await supabase.from('payees').insert({ budget_id: budgetId, name: trimmed }).select('id').single();
    return (data?.id as string) ?? null;
  }, [budgetId, rawPayees]);

  const addTransaction = useCallback(async (t: NewTransaction) => {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('transactions').insert({
      budget_id: budgetId, account_id: t.accountId, date: t.date,
      payee_id: t.payeeId, category_id: t.categoryId, memo: t.memo,
      amount: t.amount, status: 'uncleared', created_by: auth.user?.id,
    });
    await refetch();
  }, [budgetId, refetch]);

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

  const value: BudgetCtx = {
    loading, viewMonth, setViewMonth, rows, rta, summaries, firstMonth, groups, allCategories,
    accounts, payees, transactions, recentMoves,
    categoryName: (id) => nameById.get(id) ?? id,
    accountName: (id) => accNameById.get(id) ?? id,
    groupIdOf: (id) => groupById.get(id) ?? '',
    refetch, setAssigned, addGroup, renameGroup, archiveGroup, addCategory, renameCategory, archiveCategory, setTarget, removeTarget, setSnooze, moveMoney, applyProposals,
    addAccount, upsertPayee, addTransaction,
    setTxStatus, updateTransaction, deleteTransaction, reconcileAccount, addTransfer,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used within BudgetProvider');
  return v;
}
