import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeThrough, buildPlanRows, monthOf } from '../engine';
import type { Month, PlanRow } from '../engine';
import { toBudgetInput, deriveFirstMonth } from '../lib/mappers';
import type { RawBudgetData } from '../lib/mappers';

interface BudgetCtx {
  loading: boolean;
  viewMonth: Month;
  setViewMonth: (m: Month) => void;
  rows: PlanRow[];
  rta: number;
  /** danh sách (groupId, groupName) theo sort_order, để render nhóm */
  groups: { id: string; name: string; isSystem: boolean }[];
  categoryName: (id: string) => string;
  groupIdOf: (categoryId: string) => string;
  refetch: () => Promise<void>;
  setAssigned: (categoryId: string, amount: number) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  addCategory: (groupId: string, name: string, kind: string) => Promise<void>;
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

  const { rows, rta } = useMemo(() => {
    const input = toBudgetInput(raw, deriveFirstMonth(raw, viewMonth));
    const summaries = computeThrough(input, viewMonth);
    return { rows: buildPlanRows(input, summaries, viewMonth), rta: summaries.get(viewMonth)?.rta ?? 0 };
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

  const value: BudgetCtx = {
    loading, viewMonth, setViewMonth, rows, rta, groups,
    categoryName: (id) => nameById.get(id) ?? id,
    groupIdOf: (id) => groupById.get(id) ?? '',
    refetch, setAssigned, addGroup, addCategory,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used within BudgetProvider');
  return v;
}
