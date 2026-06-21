import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n/useI18n';

// Mock mermaid so the test doesn't depend on real rendering
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({
      svg: '<svg data-testid="mock-mermaid"><text>Lập kế hoạch</text></svg>',
      bindFunctions: () => {},
    }),
  },
}));

import { OverviewMindmap } from '../OverviewMindmap';

describe('OverviewMindmap', () => {
  test('renders mermaid SVG after dynamic import', async () => {
    render(
      <I18nProvider>
        <OverviewMindmap onSelectLeaf={() => {}} />
      </I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid')).toBeInTheDocument();
    });
  });
});
