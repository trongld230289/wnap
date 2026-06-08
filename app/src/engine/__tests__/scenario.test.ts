import { expect, test } from 'vitest';
import {
  computeThrough, buildPlanRows, categoryStatus,
  isOverspent, isUnderfunded, proposeUnderfunded,
} from '../index';
import type { BudgetInput } from '../index';

/**
 * Golden scenario (kb understand-target-and-autoAssign.md §3): lương về RTA
 * 1.320.000, "TV/Internet" đang overspent −200.000 từ tháng trước.
 * Kỳ vọng: cover TV qua rollover, fill bill theo due → need → saving partial.
 */
function scenario(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'tv', groupId: 'g1', name: 'TV/Internet', kind: 'bill', isSystem: false },
      { id: 'elec', groupId: 'g1', name: 'Điện', kind: 'bill', isSystem: false },
      { id: 'food', groupId: 'g2', name: 'Ăn uống', kind: 'need', isSystem: false },
      { id: 'vac', groupId: 'g3', name: 'Du lịch', kind: 'saving', isSystem: false },
    ],
    transactions: [
      // Tháng 5: chi TV 200k mà không assign → overspent
      { id: 't1', accountId: 'a1', date: '2026-05-20', categoryId: 'tv', amount: -200_000, status: 'cleared' },
      // Tháng 6: lương về
      { id: 't2', accountId: 'a1', date: '2026-06-01', categoryId: 'rta', amount: 1_320_000, status: 'cleared' },
    ],
    assignments: [],
    targets: [
      { categoryId: 'elec', strategy: 'set_aside', amount: 400_000, cadence: 'monthly', dueDay: 15 },
      { categoryId: 'food', strategy: 'refill', amount: 600_000, cadence: 'monthly' },
      { categoryId: 'vac', strategy: 'set_aside', amount: 500_000, cadence: 'monthly' },
    ],
    snoozes: [],
    firstMonth: '2026-05',
  };
}

test('golden: overspent tháng 5 trừ vào RTA tháng 6 (rollover)', () => {
  const summaries = computeThrough(scenario(), '2026-06');
  // RTA Jun = 0 (May) + 1.320k − 0 assigned + (−200k overspent May) = 1.120k
  expect(summaries.get('2026-06')!.rta).toBe(1_120_000);
  // TV reset về 0 đầu tháng 6
  expect(summaries.get('2026-06')!.categories.get('tv')!.available).toBe(0);
});

test('golden: tháng 5 TV là red, filter Overspent bắt đúng', () => {
  const input = scenario();
  const summaries = computeThrough(input, '2026-05');
  const rows = buildPlanRows(input, summaries, '2026-05');
  const tv = rows.find((r) => r.categoryId === 'tv')!;
  expect(categoryStatus(tv)).toBe('red');
  expect(rows.filter(isOverspent).map((r) => r.categoryId)).toEqual(['tv']);
});

test('golden: tháng 6 underfunded → auto-assign partial theo priority', () => {
  const input = scenario();
  const summaries = computeThrough(input, '2026-06');
  const rows = buildPlanRows(input, summaries, '2026-06');
  expect(rows.filter(isUnderfunded).map((r) => r.categoryId)).toEqual(['elec', 'food', 'vac']);

  const rta = summaries.get('2026-06')!.rta; // 1.120k, tổng cần 1.500k → partial
  const proposals = proposeUnderfunded(rows, rta);
  // elec (bill, due 15): 400k → food (need): 600k → vac (saving): 120k/500k partial
  expect(proposals).toEqual([
    { categoryId: 'elec', newAssigned: 400_000 },
    { categoryId: 'food', newAssigned: 600_000 },
    { categoryId: 'vac', newAssigned: 120_000 },
  ]);
});

test('golden: áp proposals → vac vẫn yellow, còn lại green', () => {
  const input = scenario();
  let summaries = computeThrough(input, '2026-06');
  const proposals = proposeUnderfunded(buildPlanRows(input, summaries, '2026-06'), summaries.get('2026-06')!.rta);
  input.assignments = proposals.map((p) => ({ categoryId: p.categoryId, month: '2026-06', assigned: p.newAssigned }));

  summaries = computeThrough(input, '2026-06');
  const rows = buildPlanRows(input, summaries, '2026-06');
  expect(summaries.get('2026-06')!.rta).toBe(0); // Rule 1: every dong has a job
  const status = Object.fromEntries(rows.map((r) => [r.categoryId, categoryStatus(r)]));
  expect(status['elec']).toBe('green');
  expect(status['food']).toBe('green');
  expect(status['vac']).toBe('yellow'); // còn thiếu 380k
});
