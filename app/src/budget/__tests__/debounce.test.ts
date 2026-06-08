import { expect, test, vi } from 'vitest';
import { debounce } from '../debounce';

test('gộp nhiều lần gọi trong cửa sổ thành 1', () => {
  vi.useFakeTimers();
  let n = 0;
  const d = debounce(() => { n++; }, 400);
  d(); d(); d();
  expect(n).toBe(0);
  vi.advanceTimersByTime(399);
  expect(n).toBe(0);
  vi.advanceTimersByTime(1);
  expect(n).toBe(1);
  vi.useRealTimers();
});

test('gọi lại sau khi đã chạy → chạy thêm lần nữa', () => {
  vi.useFakeTimers();
  let n = 0;
  const d = debounce(() => { n++; }, 400);
  d(); vi.advanceTimersByTime(400);
  expect(n).toBe(1);
  d(); vi.advanceTimersByTime(400);
  expect(n).toBe(2);
  vi.useRealTimers();
});

test('cancel chặn lần đang chờ', () => {
  vi.useFakeTimers();
  let n = 0;
  const d = debounce(() => { n++; }, 400);
  d(); d.cancel();
  vi.advanceTimersByTime(400);
  expect(n).toBe(0);
  vi.useRealTimers();
});
