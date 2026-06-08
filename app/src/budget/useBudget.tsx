import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeThrough, buildPlanRows, monthOf } from '../engine';
import type { Month, PlanRow, Proposal, MonthSummary, TargetStrategy, TargetCadence } from '../engine';
import { toBudgetInput, deriveFirstMonth } from '../lib/mappers';
import type { RawBudgetData } from '../lib/mappers';

export interface TargetInput {
  strategy: TargetStrategy;
  amount: number;
  cadence: TargetCadence;
  dueDay: number | null;
  dueWeekday: number | null;
  dueDate: string | null;
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
  categoryName: (id: string) => string;
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
}

const Ctx = createContext<BudgetCtx | null>(null);

async function fetchRaw(budgetId: string): Promise<{ raw: RawBudgetData; groups: BudgetCtx['groups'] }> {
  const [g, c, t, s, a, tx] = await Promise.all([
    supabase.from('category_groups').select('id,name,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('categories').select('id,group_id,name,kind,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('targets').select('category_id,strategy,amount,cadence,due_day,due_weekday,due_date').eq('budget_id', budgetId),
    supabase.from('target_snoozes').select('category_id,month').eq('budget_id', budgetId),
    supabase.from('assignments').select('category_id,month,assigned').eq('budget_id', budgetId),
    supabase.from('transactions').select('id,account_id,date,category_id,amount,status').eq('budget_id', budgetId),
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
  };
}

export function BudgetProvider({ budgetId, children }: { budgetId: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawBudgetData>({ categories: [], targets: [], snoozes: [], assignments: [], transactions: [] });
  const [groups, setGroups] = useState<BudgetCtx['groups']>([]);
  const [viewMonth, setViewMonth] = useState<Month>(monthOf(new Date().toISOString()));

  const refetch = useCallback(async () => {
    const { raw, groups } = await fetchRaw(budgetId);
    setRaw(raw);
    setGroups(groups);
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

  const setAssigned = useCallback(async (categoryId: string, amount: number) => {
    await supabase.from('assignments').upsert(
      { budget_id: budgetId, category_id: categoryId, month: viewMonth, assigned: amount },
      { onConflict: 'category_id,month' },
    );
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
    await supabase.from('targets').upsert(
      {
        budget_id: budgetId, category_id: categoryId,
        strategy: t.strategy, amount: t.amount, cadence: t.cadence,
        due_day: t.dueDay, due_weekday: t.dueWeekday, due_date: t.dueDate,
      },
      { onConflict: 'category_id' },
    );
    await refetch();
  }, [budgetId, refetch]);

  const removeTarget = useCallback(async (categoryId: string) => {
    await supabase.from('targets').delete().eq('budget_id', budgetId).eq('category_id', categoryId);
    await refetch();
  }, [budgetId, refetch]);

  const setSnooze = useCallback(async (categoryId: string, snoozed: boolean) => {
    if (snoozed) {
      await supabase.from('target_snoozes').upsert(
        { budget_id: budgetId, category_id: categoryId, month: viewMonth },
        { onConflict: 'category_id,month', ignoreDuplicates: true },
      );
    } else {
      await supabase.from('target_snoozes').delete()
        .eq('category_id', categoryId).eq('month', viewMonth);
    }
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const moveMoney = useCallback(async (fromId: string, toId: string, amount: number) => {
    const assignedNow = (id: string) =>
      raw.assignments.find((a) => a.category_id === id && a.month === viewMonth)?.assigned ?? 0;
    await supabase.from('assignments').upsert(
      [
        { budget_id: budgetId, category_id: fromId, month: viewMonth, assigned: assignedNow(fromId) - amount },
        { budget_id: budgetId, category_id: toId, month: viewMonth, assigned: assignedNow(toId) + amount },
      ],
      { onConflict: 'category_id,month' },
    );
    await refetch();
  }, [budgetId, viewMonth, raw, refetch]);

  const applyProposals = useCallback(async (proposals: Proposal[]) => {
    if (proposals.length === 0) return;
    await supabase.from('assignments').upsert(
      proposals.map((p) => ({ budget_id: budgetId, category_id: p.categoryId, month: viewMonth, assigned: p.newAssigned })),
      { onConflict: 'category_id,month' },
    );
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const value: BudgetCtx = {
    loading, viewMonth, setViewMonth, rows, rta, summaries, firstMonth, groups,
    categoryName: (id) => nameById.get(id) ?? id,
    groupIdOf: (id) => groupById.get(id) ?? '',
    refetch, setAssigned, addGroup, addCategory,
    setTarget, removeTarget, setSnooze, moveMoney, applyProposals,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used within BudgetProvider');
  return v;
}
