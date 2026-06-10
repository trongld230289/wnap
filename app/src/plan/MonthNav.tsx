import { useBudget } from '../budget/useBudget';
import { nextMonth, prevMonth } from '../engine';
import { useI18n } from '../i18n/useI18n';
import { Button } from '@/components/ui/button';

export function MonthNav() {
  const { viewMonth, setViewMonth } = useBudget();
  const { t, lang } = useI18n();
  const [y, m] = viewMonth.split('-');
  const label =
    lang === 'en'
      ? new Date(Number(y), Number(m) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
      : t('plan.monthLabel', { month: m, year: y });
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => setViewMonth(prevMonth(viewMonth))}>◀</Button>
      <span className="min-w-[120px] text-center font-semibold">{label}</span>
      <Button variant="ghost" size="icon" onClick={() => setViewMonth(nextMonth(viewMonth))}>▶</Button>
    </div>
  );
}
