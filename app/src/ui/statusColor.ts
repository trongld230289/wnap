import type { BarColor } from '../budget/barFill';

/** Class màu chữ + nền-mờ (badge) cho từng màu status, dùng chung toàn UI. */
export const STATUS_TEXT: Record<BarColor, string> = {
  red: 'text-status-red',
  yellow: 'text-status-amber',
  green: 'text-status-green',
  gray: 'text-status-gray',
};
export const STATUS_BAR_BG: Record<BarColor, string> = {
  red: 'bg-status-red',
  yellow: 'bg-status-amber',
  green: 'bg-status-green',
  gray: 'bg-status-gray',
};
