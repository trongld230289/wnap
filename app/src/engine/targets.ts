import { monthOf, monthsRemaining, weekdayCountInMonth } from './dates';
import type { Month, Target } from './types';

export interface NeedContext {
  month: Month;
  availableAtMonthStart: number; // = CategoryMonth.startBalance
  snoozed?: boolean;
}

/**
 * "Tháng này cần assign bao nhiêu" theo spec §4b.
 * have_balance / yearly / custom: chia gap đều cho số tháng còn lại → tự
 * redistribute khi tháng trước hụt (Rule 2), vì startBalance tháng sau thấp hơn.
 */
export function needed(target: Target, ctx: NeedContext): number {
  if (ctx.snoozed) return 0;

  if (target.cadence === 'weekly') {
    return target.amount * weekdayCountInMonth(ctx.month, target.dueWeekday ?? 1);
  }

  if (target.strategy === 'have_balance' || target.cadence === 'yearly' || target.cadence === 'custom') {
    const deadline = monthOf(target.dueDate!); // schema bắt buộc dueDate cho nhóm này
    const remaining = monthsRemaining(ctx.month, deadline);
    const gap = Math.max(0, target.amount - ctx.availableAtMonthStart);
    return Math.ceil(gap / remaining);
  }

  if (target.strategy === 'set_aside') return target.amount;

  // refill (monthly): chỉ đòi phần thiếu so với cap
  return Math.max(0, target.amount - ctx.availableAtMonthStart);
}

export function toGo(target: Target, ctx: NeedContext, assignedThisMonth: number): number {
  return Math.max(0, needed(target, ctx) - assignedThisMonth);
}
