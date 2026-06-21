import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n/useI18n';
import { useGuideI18n } from '../useGuideI18n';
import { guideDict } from '../guideDict';

function Probe({ k }: { k: string }) {
  const { t } = useGuideI18n();
  return <span data-testid="out">{t(k)}</span>;
}

describe('useGuideI18n', () => {
  test('resolves an existing key in default vi', () => {
    render(<I18nProvider><Probe k="guide.modal.title" /></I18nProvider>);
    expect(screen.getByTestId('out').textContent).toBe(guideDict.vi['guide.modal.title']);
  });

  test('falls back to the key itself when unknown', () => {
    render(<I18nProvider><Probe k="does.not.exist" /></I18nProvider>);
    expect(screen.getByTestId('out').textContent).toBe('does.not.exist');
  });
});
