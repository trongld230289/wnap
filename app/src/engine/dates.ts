export type Month = string; // 'YYYY-MM'

/** Giả định date dạng ISO 'YYYY-MM-DD'; lấy 7 ký tự đầu. */
export function monthOf(date: string): Month {
  return date.slice(0, 7);
}

export function nextMonth(m: Month): Month {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
}

export function prevMonth(m: Month): Month {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
}

export function monthRange(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let m = from; m <= to; m = nextMonth(m)) out.push(m);
  return out;
}

/** Số tháng từ current đến deadline, TÍNH CẢ tháng hiện tại. Quá hạn → 1. */
export function monthsRemaining(current: Month, deadline: Month): number {
  const [cy, cm] = current.split('-').map(Number);
  const [dy, dm] = deadline.split('-').map(Number);
  return Math.max(1, (dy - cy) * 12 + (dm - cm) + 1);
}

export function daysInMonth(m: Month): number {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

/** Đếm số lần weekday xuất hiện trong tháng. @param weekday 0=CN .. 6=T7 (theo Date.getDay()) */
export function weekdayCountInMonth(m: Month, weekday: number): number {
  const [y, mo] = m.split('-').map(Number);
  let count = 0;
  const days = daysInMonth(m);
  for (let d = 1; d <= days; d++) {
    if (new Date(y, mo - 1, d).getDay() === weekday) count++;
  }
  return count;
}
