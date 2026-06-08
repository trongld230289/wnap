import { expect, test } from 'vitest';
import { detectRowSignal, detectRtaSignal } from '../signals';

test('đạt target: vàng → xanh', () => {
  expect(detectRowSignal({ color: 'yellow', assigned: 100 }, { color: 'green', assigned: 200 })).toBe('target-reached');
});

test('cover overspent: đỏ → khác đỏ', () => {
  expect(detectRowSignal({ color: 'red', assigned: 0 }, { color: 'green', assigned: 300 })).toBe('cover');
  expect(detectRowSignal({ color: 'red', assigned: 0 }, { color: 'gray', assigned: 0 })).toBe('cover');
});

test('assign: assigned tăng mà không đổi nhóm màu đặc biệt', () => {
  expect(detectRowSignal({ color: 'green', assigned: 100 }, { color: 'green', assigned: 300 })).toBe('assign');
});

test('target-reached ưu tiên hơn assign khi cùng xảy ra', () => {
  expect(detectRowSignal({ color: 'yellow', assigned: 100 }, { color: 'green', assigned: 400 })).toBe('target-reached');
});

test('không có gì: giá trị/màu giữ nguyên', () => {
  expect(detectRowSignal({ color: 'green', assigned: 100 }, { color: 'green', assigned: 100 })).toBe('none');
});

test('assigned giảm: không phải celebration', () => {
  expect(detectRowSignal({ color: 'green', assigned: 300 }, { color: 'green', assigned: 100 })).toBe('none');
});

test('RTA tăng = payday, giảm = assign, bằng = none', () => {
  expect(detectRtaSignal(5_000_000, 20_000_000)).toBe('payday');
  expect(detectRtaSignal(5_000_000, 3_000_000)).toBe('spend-assign');
  expect(detectRtaSignal(5_000_000, 5_000_000)).toBe('none');
});
