import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n/useI18n';
import { GuideContent } from '../GuideContent';
import { USE_CASES } from '../useCases';

const payday = USE_CASES.find((u) => u.id === 'payday-assign')!;

describe('GuideContent', () => {
  test('renders title, all 5 steps, example and 2 tips for payday-assign', () => {
    render(
      <I18nProvider>
        <GuideContent kind="useCase" useCase={payday} />
      </I18nProvider>,
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent)
      .toBe('Ngày lương — Phân bổ mỗi đồng (Rule 1)');
    const steps = screen.getAllByTestId('uc-step');
    expect(steps).toHaveLength(5);
    expect(steps[0].textContent).toContain('Mở Plan tab');
    expect(screen.getByTestId('uc-example').textContent).toContain('Lương 20 triệu');
    expect(screen.getAllByTestId('uc-tip')).toHaveLength(2);
  });

  test('renders overview placeholder when kind=overview', () => {
    render(
      <I18nProvider>
        <GuideContent kind="overview" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('overview-placeholder')).toBeInTheDocument();
  });
});
