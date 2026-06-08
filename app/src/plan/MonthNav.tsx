import { useBudget } from '../budget/useBudget';
import { nextMonth, prevMonth } from '../engine';
import { formatMonth } from '../budget/format';
import { Button } from '@/components/ui/button';

export function MonthNav() {
  const { viewMonth, setViewMonth } = useBudget();
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => setViewMonth(prevMonth(viewMonth))}>◀</Button>
      <span className="min-w-[120px] text-center font-semibold">Tháng {formatMonth(viewMonth)}</span>
      <Button variant="ghost" size="icon" onClick={() => setViewMonth(nextMonth(viewMonth))}>▶</Button>
    </div>
  );
}
