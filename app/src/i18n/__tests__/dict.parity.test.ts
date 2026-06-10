import { describe, it, expect } from 'vitest';
import { dict } from '../dict';

describe('dict parity', () => {
  it('vi và en có cùng tập key', () => {
    const vi = Object.keys(dict.vi).sort();
    const en = Object.keys(dict.en).sort();
    expect(en).toEqual(vi);
  });
  it('không có giá trị rỗng', () => {
    for (const lang of ['vi', 'en'] as const)
      for (const [k, v] of Object.entries(dict[lang]))
        expect(v, `${lang}.${k}`).not.toBe('');
  });
});
