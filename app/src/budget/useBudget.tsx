import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
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
  categoryName: (id: string) => string;
  accountName: (id: string) => string;
  groupIdOf: (categoryId: string) => string;
  refetch: () => Promise<void>;
  setAssigned: (categoryId: string, amount: number) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  addCategory: (groupId: string, name: string, kind: string) => Promise<void>;
  setTarget: (categoryId: string, t: TargetInput) => Promise<void>;
  removeTarget: (categoryId: string) => Promise<void>;
  setSnooze: (categoryId: string, snoozed: boolean) => Promise<void>;
  moveMoney: (fromId: string, toId: string, amount: number) => Promise<void>;
  applyProposals: (proposals: Proposal[]) => Promise<void>;
  addAccount: (name: string, type: AccountType) => Promise<void>;
  upsertPayee: (name: string) => Promise<string | null>;
  addTransaction: (t: NewTransaction) => Promise<void>;
}

const Ctx = createContext<BudgetCtx | null>(null);

interface FetchResult {
  raw: RawBudgetData;
  groups: BudgetCtx['groups'];
  accounts: RawAccount[];
  payees: RawPayee[];
}

async function fetchRaw(budgetId: string): Promise<FetchResult> {
  const [g, c, t, s, a, tx, acc, pay] = await Promise.all([
    supabase.from('category_groups').select('id,name,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('categories').select('id,group_id,name,kind,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('targets').select('category_id,strategy,amount,cadence,due_day,due_weekday,due_date').eq('budget_id', budgetId),
    supabase.from('target_snoozes').select('category_id,month').eq('budget_id', budgetId),
    supabase.from('assignments').select('category_id,month,assigned').eq('budget_id', budgetId),
    supabase.from('transactions').select('id,account_id,date,category_id,amount,status,payee_id,memo,transfer_id').eq('budget_id', budgetId).order('date', { ascending: false }),
    supabase.from('accounts').select('id,name,type,reconciled_at,sort_order').eq('budget_id', budgetId).eq('closed', false).order('sort_order'),
    supabase.from('payees').select('id,name').eq('budget_id', budgetId),
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
  };
}

export function BudgetProvider({ budgetId, children }: { budgetId: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawBudgetData>({ categories: [], targets: [], snoozes: [], assignments: [], transactions: [] });
  const [groups, setGroups] = useState<BudgetCtx['groups']>([]);
  const [rawAccounts, setRawAccounts] = useState<RawAccount[]>([]);
  const [rawPayees, setRawPayees] = useState<RawPayee[]>([]);
  const [viewMonth, setViewMonth] = useState<Month>(monthOf(new Date().toISOString()));

  const refetch = useCallback(async () => {
    const r = await fetchRaw(budgetId);
    setRaw(r.raw);
    setGroups(r.groups);
    setRawAccounts(r.accounts);
    setRawPayees(r.payees);
    setLoading(false);
  }, [budgetId]);

  useEffect(() => { refetch(); }, [refetch]);

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

  const addCategory = useCallback(async (groupId: string, name: string, kind: string) => {
    await supabase.from('categories').insert({ budget_id: budgetId, group_id: groupId, name, kind });
    await refetch();
  }, [budgetId, refetch]);

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

  const value: BudgetCtx = {
    loading, viewMonth, setViewMonth, rows, rta, summaries, firstMonth, groups, allCategories,
    accounts, payees, transactions,
    categoryName: (id) => nameById.get(id) ?? id,
    accountName: (id) => accNameById.get(id) ?? id,
    groupIdOf: (id) => groupById.get(id) ?? '',
    refetch, setAssigned, addGroup, addCategory, setTarget, removeTarget, setSnooze, moveMoney, applyProposals,
    addAccount, upsertPayee, addTransaction,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used within BudgetProvider');
  return v;
}
