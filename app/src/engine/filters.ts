import type { PlanRow } from './types';

export const isOverspent = (r: PlanRow): boolean => r.available < 0;

export const isUnderfunded = (r: PlanRow): boolean =>
  !!r.target && !r.snoozed && r.needed - r.assigned > 0;

/** refill/have_balance: tiền vượt cap; set_aside: assign vượt yêu cầu tháng này */
export const isOverfunded = (r: PlanRow): boolean =>
  !!r.target &&
  (r.target.strategy === 'set_aside'
    ? r.assigned > r.needed
    : r.available > r.target.amount);

export const isMoneyAvailable = (r: PlanRow): boolean => r.available > 0;

export const isSnoozed = (r: PlanRow): boolean => r.snoozed;
