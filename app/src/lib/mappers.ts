import { monthOf } from '../engine';
import type {
  BudgetInput, Category, Assignment, Target, Snooze, Transaction, Month,
} from '../engine';

export interface RawCategory { id: string; group_id: string; name: string; kind: Category['kind']; is_system: boolean; }
export interface RawTarget { category_id: string; strategy: Target['strategy']; amount: number; cadence: Target['cadence']; due_day: number | null; due_weekday: number | null; due_date: string | null; }
export interface RawSnooze { category_id: string; month: string; }
export interface RawAssignment { category_id: string; month: string; assigned: number; }
export interface RawTransaction { id: string; account_id: string; date: string; category_id: string | null; amount: number; status: Transaction['status']; }

export interface RawBudgetData {
  categories: RawCategory[];
  targets: RawTarget[];
  snoozes: RawSnooze[];
  assignments: RawAssignment[];
  transactions: RawTransaction[];
}

const mapCategory = (r: RawCategory): Category => ({ id: r.id, groupId: r.group_id, name: r.name, kind: r.kind, isSystem: r.is_system });
const mapTarget = (r: RawTarget): Target => ({ categoryId: r.category_id, strategy: r.strategy, amount: r.amount, cadence: r.cadence, dueDay: r.due_day, dueWeekday: r.due_weekday, dueDate: r.due_date });
const mapSnooze = (r: RawSnooze): Snooze => ({ categoryId: r.category_id, month: r.month });
const mapAssignment = (r: RawAssignment): Assignment => ({ categoryId: r.category_id, month: r.month, assigned: r.assigned });
const mapTransaction = (r: RawTransaction): Transaction => ({ id: r.id, accountId: r.account_id, date: r.date, categoryId: r.category_id, amount: r.amount, status: r.status });

/** Tháng nhỏ nhất xuất hiện trong transactions (theo date) hoặc assignments (theo month). Rỗng → fallback. */
export function deriveFirstMonth(raw: RawBudgetData, fallback: Month = monthOf(new Date().toISOString())): Month {
  const months: Month[] = [
    ...raw.transactions.map((t) => monthOf(t.date)),
    ...raw.assignments.map((a) => a.month),
  ];
  if (months.length === 0) return fallback;
  return months.reduce((min, m) => (m < min ? m : min));
}

export function toBudgetInput(raw: RawBudgetData, firstMonth: Month): BudgetInput {
  return {
    categories: raw.categories.map(mapCategory),
    targets: raw.targets.map(mapTarget),
    snoozes: raw.snoozes.map(mapSnooze),
    assignments: raw.assignments.map(mapAssignment),
    transactions: raw.transactions.map(mapTransaction),
    firstMonth,
  };
}
