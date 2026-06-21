import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/useI18n';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mm"></svg>', bindFunctions: () => {} }),
  },
}));

import { GuideModal } from '../GuideModal';

describe('GuideModal', () => {
  test('opens with overview selected, switches content when a use case is clicked', async () => {
    render(
      <I18nProvider>
        <GuideModal open={true} onOpenChange={() => {}} />
      </I18nProvider>,
    );
    // overview placeholder/mermaid mock should be visible initially
    await screen.findByTestId('mm');
    // click "Ngày lương — Phân bổ mỗi đồng (Rule 1)" in sidebar
    await userEvent.click(screen.getByRole('button', { name: /Ngày lương/ }));
    expect(
      screen.getByRole('heading', { level: 2, name: /Ngày lương/ }),
    ).toBeInTheDocument();
  });
});
