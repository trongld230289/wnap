/** Định dạng VND nguyên: 1120000 → "1.120.000", số âm dùng dấu trừ U+2212. */
export function formatVnd(n: number): string {
  const neg = n < 0;
  const digits = Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + digits;
}

/** Đọc số nguyên VND từ chuỗi người dùng gõ; bỏ mọi ký tự thừa. Rỗng → 0. */
export function parseVnd(s: string): number {
  const neg = /[-−]/.test(s);
  const digits = s.replace(/[^\d]/g, '');
  if (digits === '') return 0;
  const n = parseInt(digits, 10);
  return neg ? -n : n;
}

/** Hiển thị tháng chuẩn VN: 'YYYY-MM' → 'MM/YYYY'. (Month nội bộ vẫn là 'YYYY-MM'.) */
export function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  return `${mo}/${y}`;
}
