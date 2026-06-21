import { describe, test, expect } from 'vitest';
import { buildMindmapSource, LEAF_TO_USECASE } from '../mainFunctions';
import { USE_CASES } from '../useCases';

describe('buildMindmapSource', () => {
  test('vi source starts with mindmap keyword', () => {
    expect(buildMindmapSource('vi')).toMatch(/^mindmap/);
  });

  test('vi source contains all three top-level branches', () => {
    const s = buildMindmapSource('vi');
    expect(s).toContain('Lập kế hoạch');
    expect(s).toContain('Sổ giao dịch');
    expect(s).toContain('Gia đình');
  });

  test('en source contains translated branches', () => {
    const s = buildMindmapSource('en');
    expect(s).toContain('Plan');
    expect(s).toContain('Ledger');
    expect(s).toContain('Family');
  });

  test('every value in LEAF_TO_USECASE is a known use case id', () => {
    const known = new Set(USE_CASES.map((u) => u.id));
    for (const id of Object.values(LEAF_TO_USECASE)) {
      expect(known).toContain(id);
    }
  });
});
