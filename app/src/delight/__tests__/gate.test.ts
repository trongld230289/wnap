import { expect, test } from 'vitest';
import { shouldAnimate } from '../gate';

test('bật khi user cho phép và OS không yêu cầu giảm chuyển động', () => {
  expect(shouldAnimate(false, true)).toBe(true);
});
test('tắt khi OS yêu cầu giảm chuyển động', () => {
  expect(shouldAnimate(true, true)).toBe(false);
});
test('tắt khi user tắt setting', () => {
  expect(shouldAnimate(false, false)).toBe(false);
});
