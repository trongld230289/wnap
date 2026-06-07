import { expect, test } from 'vitest';
import { needed, toGo } from '../targets';
import type { Target } from '../types';

function t(p: Partial<Target>): Target {
  return { categoryId: 'c1', strategy: 'set_aside', amount: 100_000, cadence: 'monthly', ...p };
}
const ctx = (p: Partial<{ month: string; availableAtMonthStart: number; snoozed: boolean }> = {}) =>
  ({ month: '2026-06', availableAtMonthStart: 0, snoozed: false, ...p });

test('set_aside đòi đủ amount bất kể số dư cũ (spec Module C §2)', () => {
  expect(needed(t({ strategy: 'set_aside', amount: 100_000 }),
    ctx({ availableAtMonthStart: 500_000 }))).toBe(100_000);
});

test('refill chỉ đòi phần thiếu so với cap', () => {
  expect(needed(t({ strategy: 'refill', amount: 300_000 }),
    ctx({ availableAtMonthStart: 120_000 }))).toBe(180_000);
});

test('refill đủ rồi thì needed = 0', () => {
  expect(needed(t({ strategy: 'refill', amount: 300_000 }),
    ctx({ availableAtMonthStart: 350_000 }))).toBe(0);
});

test('have_balance chia đều theo số tháng còn lại (Rule 2)', () => {
  // cần 1.2M trước 12/2026, đang 7/2026, chưa có gì → 6 tháng → 200k/tháng
  const target = t({ strategy: 'have_balance', cadence: 'custom', amount: 1_200_000, dueDate: '2026-12-31' });
  expect(needed(target, ctx({ month: '2026-07' }))).toBe(200_000);
});

test('have_balance redistribute khi tháng trước hụt (Rule 2 adaptation)', () => {
  // Tháng 7 chỉ assign 100k → đầu tháng 8 có 100k, còn 5 tháng → (1.2M−100k)/5 = 220k
  const target = t({ strategy: 'have_balance', cadence: 'custom', amount: 1_200_000, dueDate: '2026-12-31' });
  expect(needed(target, ctx({ month: '2026-08', availableAtMonthStart: 100_000 }))).toBe(220_000);
});

test('yearly quy về have_balance theo deadline', () => {
  const target = t({ strategy: 'set_aside', cadence: 'yearly', amount: 6_000_000, dueDate: '2026-12-01' });
  // 6/2026 → 12/2026 = 7 tháng, chưa có gì → ceil(6M/7) = 857.143
  expect(needed(target, ctx({ month: '2026-06' }))).toBe(857_143);
});

test('weekly = amount × số lần weekday trong tháng', () => {
  const target = t({ cadence: 'weekly', amount: 200_000, dueWeekday: 1 });
  expect(needed(target, ctx({ month: '2026-06' }))).toBe(1_000_000); // 5 thứ Hai
});

test('snoozed → needed = 0 (spec Module C §2)', () => {
  expect(needed(t({ strategy: 'set_aside', amount: 100_000 }), ctx({ snoozed: true }))).toBe(0);
});

test('toGo = needed − assigned, không âm', () => {
  const target = t({ strategy: 'set_aside', amount: 100_000 });
  expect(toGo(target, ctx(), 40_000)).toBe(60_000);
  expect(toGo(target, ctx(), 150_000)).toBe(0);
});

test('snoozed override cả weekly cadence', () => {
  expect(needed(t({ cadence: 'weekly', amount: 200_000, dueWeekday: 1 }), ctx({ snoozed: true }))).toBe(0);
});

test('have_balance đã đủ tiền → needed = 0', () => {
  const target = t({ strategy: 'have_balance', cadence: 'custom', amount: 1_200_000, dueDate: '2026-12-31' });
  expect(needed(target, ctx({ month: '2026-07', availableAtMonthStart: 1_500_000 }))).toBe(0);
});

test('weekly dueWeekday = 0 (Chủ nhật) không bị fallback', () => {
  const target = t({ cadence: 'weekly', amount: 100_000, dueWeekday: 0 });
  expect(needed(target, ctx({ month: '2026-06' }))).toBe(400_000); // 4 Chủ nhật
});
