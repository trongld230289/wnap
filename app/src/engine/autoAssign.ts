import { prevMonth } from './dates';
import type { Month, MonthSummary, PlanRow, Proposal } from './types';

/** Các tháng lịch sử N−1 … N−limit, không lùi quá firstMonth. */
function historyMonths(month: Month, firstMonth: Month, limit = 12): Month[] {
  const out: Month[] = [];
  let m = prevMonth(month);
  while (out.length < limit && m >= firstMonth) {
    out.push(m);
    m = prevMonth(m);
  }
  return out;
}

/** Loại đề xuất không thay đổi gì (newAssigned === assigned hiện tại). */
function withoutNoOps(rows: PlanRow[], proposals: Proposal[]): Proposal[] {
  const currentByCat = new Map(rows.map((r) => [r.categoryId, r.assigned]));
  return proposals.filter((p) => p.newAssigned !== currentByCat.get(p.categoryId));
}

export function proposeAssignedLastMonth(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month,
): Proposal[] {
  const prev = summaries.get(prevMonth(month));
  if (!prev) return [];
  return withoutNoOps(rows, rows.map((r) => ({
    categoryId: r.categoryId,
    newAssigned: prev.categories.get(r.categoryId)?.assigned ?? 0,
  })));
}

export function proposeSpentLastMonth(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month,
): Proposal[] {
  const prev = summaries.get(prevMonth(month));
  if (!prev) return [];
  return withoutNoOps(rows, rows.map((r) => {
    const act = prev.categories.get(r.categoryId)?.activity ?? 0;
    return { categoryId: r.categoryId, newAssigned: Math.max(0, -act) };
  }));
}

/**
 * Trung bình trên TOÀN BỘ cửa sổ lịch sử: tháng không có dữ liệu tính là 0
 * (đúng hành vi YNAB — category mới thêm sẽ bị pha loãng average).
 */
function average(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month,
  firstMonth: Month, pick: (assigned: number, activity: number) => number,
): Proposal[] {
  const hist = historyMonths(month, firstMonth);
  if (hist.length === 0) return [];
  return withoutNoOps(rows, rows.map((r) => {
    const sum = hist.reduce((s, m) => {
      const cm = summaries.get(m)?.categories.get(r.categoryId);
      return s + (cm ? pick(cm.assigned, cm.activity) : 0);
    }, 0);
    return { categoryId: r.categoryId, newAssigned: Math.round(sum / hist.length) };
  }));
}

export function proposeAverageAssigned(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month, firstMonth: Month,
): Proposal[] {
  return average(rows, summaries, month, firstMonth, (assigned) => assigned);
}

export function proposeAverageSpent(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month, firstMonth: Month,
): Proposal[] {
  return average(rows, summaries, month, firstMonth, (_a, activity) => Math.max(0, -activity));
}

export function proposeResetAssigned(rows: PlanRow[]): Proposal[] {
  return rows
    .filter((r) => r.assigned !== 0)
    .map((r) => ({ categoryId: r.categoryId, newAssigned: 0 }));
}

export function proposeResetAvailable(rows: PlanRow[]): Proposal[] {
  return rows
    .filter((r) => r.available > 0)
    .map((r) => ({ categoryId: r.categoryId, newAssigned: r.assigned - r.available }));
}
