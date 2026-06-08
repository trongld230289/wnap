import { expect, test } from 'vitest';
import { formatVnd, parseVnd, formatMonth } from '../format';

test('formatVnd nhóm hàng nghìn bằng dấu chấm', () => {
  expect(formatVnd(1_120_000)).toBe('1.120.000');
  expect(formatVnd(0)).toBe('0');
  expect(formatVnd(-200_000)).toBe('−200.000'); // dấu trừ U+2212
});

test('formatMonth chuẩn VN: YYYY-MM → MM/YYYY', () => {
  expect(formatMonth('2026-06')).toBe('06/2026');
  expect(formatMonth('2026-12')).toBe('12/2026');
});

test('parseVnd bỏ mọi ký tự không phải số/dấu trừ', () => {
  expect(parseVnd('1.120.000')).toBe(1_120_000);
  expect(parseVnd('400.000₫')).toBe(400_000);
  expect(parseVnd('−200.000')).toBe(-200_000);
  expect(parseVnd('-50000')).toBe(-50_000);
  expect(parseVnd('')).toBe(0);
  expect(parseVnd('abc')).toBe(0);
});
