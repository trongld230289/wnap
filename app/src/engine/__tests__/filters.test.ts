import { expect, test } from 'vitest';
import { isOverspent, isUnderfunded, isOverfunded, isMoneyAvailable, isSnoozed } from '../filters';
import type { PlanRow, Target } from '../types';

function row(p: Partial<PlanRow>): PlanRow {
  return {
    categoryId: 'c1', kind: 'need', startBalance: 0, assigned: 0,
    activity: 0, available: 0, target: null, needed: 0, snoozed: false, ...p,
  };
}
const refill = (amount: number): Target =>
  ({ categoryId: 'c1', strategy: 'refill', amount, cadence: 'monthly' });
const setAside = (amount: number): Target =>
  ({ categoryId: 'c1', strategy: 'set_aside', amount, cadence: 'monthly' });

test('overspent: available âm', () => {
  expect(isOverspent(row({ available: -50_000 }))).toBe(true);
  expect(isOverspent(row({ available: 0 }))).toBe(false);
});

test('underfunded: có target, chưa snooze, còn thiếu', () => {
  expect(isUnderfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 40_000 }))).toBe(true);
  expect(isUnderfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 100_000 }))).toBe(false);
  expect(isUnderfunded(row({ target: setAside(100_000), needed: 0, snoozed: true }))).toBe(false);
  expect(isUnderfunded(row({}))).toBe(false); // không target
});

test('overfunded refill: available vượt cap', () => {
  expect(isOverfunded(row({ target: refill(300_000), available: 400_000 }))).toBe(true);
  expect(isOverfunded(row({ target: refill(300_000), available: 300_000 }))).toBe(false);
});

test('overfunded set_aside: assigned vượt needed tháng này', () => {
  expect(isOverfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 150_000 }))).toBe(true);
  expect(isOverfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 100_000 }))).toBe(false);
});

test('moneyAvailable: available dương', () => {
  expect(isMoneyAvailable(row({ available: 20_000 }))).toBe(true);
  expect(isMoneyAvailable(row({ available: 0 }))).toBe(false);
});

test('snoozed', () => {
  expect(isSnoozed(row({ snoozed: true }))).toBe(true);
});

test('overfunded have_balance: available vượt amount (cùng nhánh refill)', () => {
  const hb = (amount: number): Target =>
    ({ categoryId: 'c1', strategy: 'have_balance', amount, cadence: 'custom', dueDate: '2026-12-31' });
  expect(isOverfunded(row({ target: hb(300_000), available: 400_000 }))).toBe(true);
  expect(isOverfunded(row({ target: hb(300_000), available: 250_000 }))).toBe(false);
});

test('overfunded không target → false; isSnoozed false case', () => {
  expect(isOverfunded(row({ available: 999_000 }))).toBe(false);
  expect(isSnoozed(row({ snoozed: false }))).toBe(false);
});
