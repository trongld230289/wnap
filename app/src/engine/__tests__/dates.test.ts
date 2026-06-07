import { expect, test } from 'vitest';
import {
  monthOf, nextMonth, prevMonth, monthRange,
  monthsRemaining, daysInMonth, weekdayCountInMonth,
} from '../dates';

test('monthOf lấy YYYY-MM từ date', () => {
  expect(monthOf('2026-06-07')).toBe('2026-06');
});

test('nextMonth giữa năm', () => expect(nextMonth('2026-06')).toBe('2026-07'));
test('nextMonth qua năm', () => expect(nextMonth('2026-12')).toBe('2027-01'));
test('prevMonth giữa năm', () => expect(prevMonth('2026-06')).toBe('2026-05'));
test('prevMonth lùi năm', () => expect(prevMonth('2026-01')).toBe('2025-12'));

test('monthRange bao gồm 2 đầu', () => {
  expect(monthRange('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01']);
});

test('monthsRemaining tính cả tháng hiện tại', () => {
  expect(monthsRemaining('2026-06', '2026-12')).toBe(7);
  expect(monthsRemaining('2026-12', '2026-12')).toBe(1);
});
test('monthsRemaining quá hạn → clamp 1', () => {
  expect(monthsRemaining('2027-02', '2026-12')).toBe(1);
});

test('daysInMonth năm nhuận', () => {
  expect(daysInMonth('2028-02')).toBe(29);
  expect(daysInMonth('2026-02')).toBe(28);
});

test('weekdayCountInMonth: 6/2026 có 5 thứ Hai, 4 Chủ nhật', () => {
  expect(weekdayCountInMonth('2026-06', 1)).toBe(5); // Mon: 1,8,15,22,29
  expect(weekdayCountInMonth('2026-06', 0)).toBe(4); // Sun: 7,14,21,28
});

test('monthRange cùng 1 tháng', () => {
  expect(monthRange('2026-06', '2026-06')).toEqual(['2026-06']);
});

test('daysInMonth tháng 31 ngày', () => {
  expect(daysInMonth('2026-01')).toBe(31);
});
