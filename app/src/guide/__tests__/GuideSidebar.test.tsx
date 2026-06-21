import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/useI18n';
import { GuideSidebar } from '../GuideSidebar';

describe('GuideSidebar', () => {
  test('shows the overview item and all phase headers', () => {
    render(
      <I18nProvider>
        <GuideSidebar selection={{ kind: 'overview' }} onSelect={() => {}} />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: /Tổng quan/ })).toBeInTheDocument();
    expect(screen.getByText('Giai đoạn 1: Thiết lập')).toBeInTheDocument();
    expect(screen.getByText('Tính năng bổ sung')).toBeInTheDocument();
  });

  test('clicking a use case calls onSelect with its id', async () => {
    const onSelect = vi.fn();
    render(
      <I18nProvider>
        <GuideSidebar selection={{ kind: 'overview' }} onSelect={onSelect} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Payday|Ngày lương/i }));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'useCase', id: 'payday-assign' });
  });
});
