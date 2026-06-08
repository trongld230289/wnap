export * from './types'; // đã gồm type Month (re-export từ dates)
export {
  monthOf, nextMonth, prevMonth, monthRange,
  monthsRemaining, daysInMonth, weekdayCountInMonth,
} from './dates'; // KHÔNG export * — tránh ambiguous re-export Month với types.ts
export { computeThrough } from './compute';
export { needed, toGo, type NeedContext } from './targets';
export { buildPlanRows } from './rows';
export { categoryStatus, type CategoryStatus } from './status';
export { isOverspent, isUnderfunded, isOverfunded, isMoneyAvailable, isSnoozed } from './filters';
export {
  proposeUnderfunded, proposeAssignedLastMonth, proposeSpentLastMonth,
  proposeAverageAssigned, proposeAverageSpent,
  proposeResetAssigned, proposeResetAvailable,
} from './autoAssign';
