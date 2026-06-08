import { useBudget } from '../budget/useBudget';
import { nextMonth, prevMonth } from '../engine';
import { formatMonth } from '../budget/format';

export function MonthNav() {
  const { viewMonth, setViewMonth } = useBudget();
  return (
    <span style={{ fontWeight: 600, color: '#333' }}>
      <button onClick={() => setViewMonth(prevMonth(viewMonth))}>◀</button>
      {' '}Tháng {formatMonth(viewMonth)}{' '}
      <button onClick={() => setViewMonth(nextMonth(viewMonth))}>▶</button>
    </span>
  );
}
