import { describe, test, expect } from 'vitest';
import { USE_CASES, PHASES } from '../useCases';

describe('USE_CASES', () => {
  test('has exactly 13 entries', () => {
    expect(USE_CASES).toHaveLength(13);
  });

  test('every id is unique', () => {
    const ids = USE_CASES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every phase is a known phase', () => {
    for (const u of USE_CASES) {
      expect(PHASES).toContain(u.phase);
    }
  });

  test('every record has non-empty title, steps, example, tips', () => {
    for (const u of USE_CASES) {
      expect(u.titleKey).toMatch(/^guide\.uc\./);
      expect(u.exampleKey).toMatch(/^guide\.uc\./);
      expect(u.stepKeys.length).toBeGreaterThan(0);
      expect(u.tipKeys.length).toBeGreaterThan(0);
    }
  });

  test('id appears in titleKey, stepKeys and tipKeys', () => {
    for (const u of USE_CASES) {
      expect(u.titleKey).toBe(`guide.uc.${u.id}.title`);
      expect(u.exampleKey).toBe(`guide.uc.${u.id}.example`);
      u.stepKeys.forEach((k, i) => expect(k).toBe(`guide.uc.${u.id}.step.${i + 1}`));
      u.tipKeys.forEach((k, i) => expect(k).toBe(`guide.uc.${u.id}.tip.${i + 1}`));
    }
  });
});
