import {
  proposeUnderfunded, proposeAssignedLastMonth, proposeSpentLastMonth,
  proposeAverageAssigned, proposeAverageSpent, proposeResetAssigned, proposeResetAvailable,
} from '../engine';
import type { PlanRow, Proposal, Month, MonthSummary } from '../engine';

export type AutoKind =
  | 'underfunded' | 'assignedLastMonth' | 'spentLastMonth'
  | 'averageAssigned' | 'averageSpent' | 'resetAvailable' | 'resetAssigned';

export interface AutoCtx {
  rows: PlanRow[];
  rta: number;
  summaries: Map<Month, MonthSummary>;
  month: Month;
  firstMonth: Month;
}

export const AUTO_KINDS: { id: AutoKind; label: string }[] = [
  { id: 'underfunded', label: 'Underfunded — lấp đủ target' },
  { id: 'assignedLastMonth', label: 'Assigned Last Month' },
  { id: 'spentLastMonth', label: 'Spent Last Month' },
  { id: 'averageAssigned', label: 'Average Assigned' },
  { id: 'averageSpent', label: 'Average Spent' },
  { id: 'resetAvailable', label: 'Reset Available' },
  { id: 'resetAssigned', label: 'Reset Assigned' },
];

export function computeProposals(kind: AutoKind, ctx: AutoCtx): Proposal[] {
  const { rows, rta, summaries, month, firstMonth } = ctx;
  switch (kind) {
    case 'underfunded': return proposeUnderfunded(rows, rta);
    case 'assignedLastMonth': return proposeAssignedLastMonth(rows, summaries, month);
    case 'spentLastMonth': return proposeSpentLastMonth(rows, summaries, month);
    case 'averageAssigned': return proposeAverageAssigned(rows, summaries, month, firstMonth);
    case 'averageSpent': return proposeAverageSpent(rows, summaries, month, firstMonth);
    case 'resetAvailable': return proposeResetAvailable(rows);
    case 'resetAssigned': return proposeResetAssigned(rows);
  }
}
