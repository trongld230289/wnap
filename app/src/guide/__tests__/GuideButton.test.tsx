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

import { GuideButton } from '../GuideButton';

describe('GuideButton', () => {
  test('renders with the tooltip aria-label', () => {
    render(<I18nProvider><GuideButton /></I18nProvider>);
    expect(screen.getByRole('button', { name: /Hướng dẫn sử dụng/ })).toBeInTheDocument();
  });

  test('clicking opens the modal', async () => {
    render(<I18nProvider><GuideButton /></I18nProvider>);
    await userEvent.click(screen.getByRole('button', { name: /Hướng dẫn sử dụng/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
