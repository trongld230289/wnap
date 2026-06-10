import { describe, it, expect } from 'vitest';
import { translate } from '../translate';

const d = {
  vi: { greet: 'Chào {name}', only: 'Chỉ VI' },
  en: { greet: 'Hi {name}' },
} as unknown as Parameters<typeof translate>[0];

describe('translate', () => {
  it('trả đúng chuỗi theo lang', () => {
    expect(translate(d, 'en', 'greet', { name: 'A' })).toBe('Hi A');
  });
  it('chèn biến', () => {
    expect(translate(d, 'vi', 'greet', { name: 'Bố' })).toBe('Chào Bố');
  });
  it('thiếu key ở en → fallback vi', () => {
    expect(translate(d, 'en', 'only')).toBe('Chỉ VI');
  });
  it('thiếu hẳn → trả chính key', () => {
    expect(translate(d, 'en', 'missing')).toBe('missing');
  });
  it('biến thiếu giữ nguyên placeholder', () => {
    expect(translate(d, 'en', 'greet')).toBe('Hi {name}');
  });
});
