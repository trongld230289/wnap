import { needed } from './targets';
import type { BudgetInput, Month, MonthSummary, PlanRow } from './types';

export function buildPlanRows(
  input: BudgetInput,
  summaries: Map<Month, MonthSummary>,
  month: Month,
): PlanRow[] {
  const summary = summaries.get(month);
  if (!summary) throw new Error(`month ${month} not computed`);
  const snoozedSet = new Set(
    input.snoozes.filter((s) => s.month === month).map((s) => s.categoryId),
  );
  const targetByCat = new Map(input.targets.map((t) => [t.categoryId, t]));

  return input.categories
    .filter((c) => !c.isSystem)
    .map((c) => {
      const cm = summary.categories.get(c.id)!;
      const target = targetByCat.get(c.id) ?? null;
      const snoozed = snoozedSet.has(c.id);
      const nd = target
        ? needed(target, { month, availableAtMonthStart: cm.startBalance, snoozed })
        : 0;
      return {
        categoryId: c.id, kind: c.kind,
        startBalance: cm.startBalance, assigned: cm.assigned,
        activity: cm.activity, available: cm.available,
        target, needed: nd, snoozed,
      };
    });
}
