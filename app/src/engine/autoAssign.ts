import { prevMonth } from './dates';
import type { CategoryKind, Month, MonthSummary, PlanRow, Proposal, Target } from './types';

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

const KIND_PRIORITY: Record<CategoryKind, number> = { bill: 1, need: 2, saving: 3, other: 4 };

/**
 * Sort key trong cùng bucket: bill due sớm đứng trước.
 * Lưu ý: weekly (0–6) và monthly (1–31) trộn cùng thang — weekly chủ đích
 * xếp trước vì lặp lại sát hơn; yearly/custom (50) xếp sau bill trong tháng.
 */
function dueTiebreak(t: Target | null): number {
  if (!t) return 99;
  if (t.cadence === 'monthly') return t.dueDay ?? 31;
  if (t.cadence === 'weekly') return t.dueWeekday ?? 7;
  return 50; // yearly/custom: sau các bill trong tháng
}

/**
 * Nút Underfunded (spec §4d): fill theo Priority Stack
 * ① cover Red → ② bill theo due gần nhất → ③ need → ④ saving → ⑤ other.
 * Trả về newAssigned tuyệt đối; tổng delta không vượt rta.
 */
export function proposeUnderfunded(rows: PlanRow[], rta: number): Proposal[] {
  if (rta <= 0) return [];
  let remaining = rta;

  interface Want { categoryId: string; amount: number; priority: number; tiebreak: number; order: number }
  const wants: Want[] = [];
  rows.forEach((r, i) => {
    const cover = Math.max(0, -r.available);
    if (cover > 0) wants.push({ categoryId: r.categoryId, amount: cover, priority: 0, tiebreak: 0, order: i });
    if (r.target && !r.snoozed) {
      const gap = Math.max(0, r.needed - r.assigned);
      if (gap > 0) {
        wants.push({
          categoryId: r.categoryId, amount: gap,
          priority: KIND_PRIORITY[r.kind], tiebreak: dueTiebreak(r.target), order: i,
        });
      }
    }
  });
  wants.sort((a, b) => a.priority - b.priority || a.tiebreak - b.tiebreak || a.order - b.order);

  const delta = new Map<string, number>();
  for (const w of wants) {
    if (remaining <= 0) break;
    const give = Math.min(w.amount, remaining);
    delta.set(w.categoryId, (delta.get(w.categoryId) ?? 0) + give);
    remaining -= give;
  }

  return rows
    .filter((r) => delta.has(r.categoryId))
    .map((r) => ({ categoryId: r.categoryId, newAssigned: r.assigned + delta.get(r.categoryId)! }));
}
