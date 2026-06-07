import type { Month } from './dates';
export type { Month };

export type CategoryKind = 'bill' | 'need' | 'saving' | 'other';
export type TargetStrategy = 'set_aside' | 'refill' | 'have_balance';
export type TargetCadence = 'weekly' | 'monthly' | 'yearly' | 'custom';
export type TxStatus = 'uncleared' | 'cleared' | 'reconciled';

export interface Category {
  id: string;
  groupId: string;
  name: string;
  kind: CategoryKind;
  isSystem: boolean; // true = "Inflow: Ready to Assign"
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // 'YYYY-MM-DD'
  categoryId: string | null;
  amount: number; // VND nguyên; âm = outflow, dương = inflow
  status: TxStatus;
}

export interface Assignment {
  categoryId: string;
  month: Month;
  assigned: number;
}

export interface Target {
  categoryId: string;
  strategy: TargetStrategy;
  amount: number;
  cadence: TargetCadence;
  dueDay?: number | null;     // 1–31; null = cuối tháng
  dueWeekday?: number | null; // 0–6, cho weekly
  dueDate?: string | null;    // 'YYYY-MM-DD', bắt buộc cho have_balance/yearly/custom
}

export interface Snooze {
  categoryId: string;
  month: Month;
}

export interface BudgetInput {
  categories: Category[];
  transactions: Transaction[];
  assignments: Assignment[];
  targets: Target[];
  snoozes: Snooze[];
  firstMonth: Month;
}

export interface CategoryMonth {
  categoryId: string;
  startBalance: number; // max(available tháng trước, 0)
  assigned: number;
  activity: number;
  available: number;
}

export interface MonthSummary {
  month: Month;
  rta: number;
  categories: Map<string, CategoryMonth>;
}

/** Dữ liệu 1 dòng Plan screen — đầu vào cho status/filters/auto-assign */
export interface PlanRow {
  categoryId: string;
  kind: CategoryKind;
  startBalance: number;
  assigned: number;
  activity: number;
  available: number;
  target: Target | null;
  needed: number; // 0 nếu không có target hoặc snoozed
  snoozed: boolean;
}

export interface Proposal {
  categoryId: string;
  newAssigned: number; // giá trị Assigned mới (tuyệt đối, không phải delta)
}
