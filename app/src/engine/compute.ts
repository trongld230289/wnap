import { monthOf, monthRange } from './dates';
import type { BudgetInput, CategoryMonth, Month, MonthSummary } from './types';

/**
 * Tính tuần tự mọi tháng từ firstMonth đến `through` (spec §4a):
 *   available = max(prevAvailable, 0) + assigned + activity
 *   rta       = prevRta + inflow − totalAssigned + Σ min(prevAvailable, 0)
 * Trả về Map rỗng nếu through < firstMonth.
 */
export function computeThrough(input: BudgetInput, through: Month): Map<Month, MonthSummary> {
  const result = new Map<Month, MonthSummary>();
  const userCats = input.categories.filter((c) => !c.isSystem);
  const systemIds = new Set(input.categories.filter((c) => c.isSystem).map((c) => c.id));

  // Index activity theo (month, category) và inflow theo month
  const activity = new Map<string, number>();
  const inflow = new Map<Month, number>();
  for (const t of input.transactions) {
    if (!t.categoryId) continue;
    const m = monthOf(t.date);
    if (systemIds.has(t.categoryId)) {
      inflow.set(m, (inflow.get(m) ?? 0) + t.amount);
    } else {
      const key = `${m}|${t.categoryId}`;
      activity.set(key, (activity.get(key) ?? 0) + t.amount);
    }
  }
  const assigned = new Map<string, number>();
  for (const a of input.assignments) {
    assigned.set(`${a.month}|${a.categoryId}`, a.assigned);
  }

  let prev: MonthSummary | null = null;
  for (const m of monthRange(input.firstMonth, through)) {
    const cats = new Map<string, CategoryMonth>();
    let totalAssigned = 0;
    let overspentCarry = 0;

    for (const c of userCats) {
      const prevAvail = prev?.categories.get(c.id)?.available ?? 0;
      const startBalance = Math.max(prevAvail, 0);
      const asg = assigned.get(`${m}|${c.id}`) ?? 0;
      const act = activity.get(`${m}|${c.id}`) ?? 0;
      cats.set(c.id, {
        categoryId: c.id, startBalance, assigned: asg, activity: act,
        available: startBalance + asg + act,
      });
      totalAssigned += asg;
      overspentCarry += Math.min(prevAvail, 0);
    }

    const rta = (prev?.rta ?? 0) + (inflow.get(m) ?? 0) - totalAssigned + overspentCarry;
    const summary: MonthSummary = { month: m, rta, categories: cats };
    result.set(m, summary);
    prev = summary;
  }
  return result;
}
