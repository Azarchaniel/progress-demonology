import Decimal from 'break_infinity.js';

/** Compact notation without converting enormous values into native numbers. */
export function formatNumber(value: Decimal | number | string, decimals = 0): string {
  const n = new Decimal(value);
  if (!Number.isFinite(n.mantissa) || !Number.isFinite(n.exponent)) return '∞';
  if (n.abs().lt(1e6)) return n.toNumber().toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  const group = Math.floor(n.exponent / 3);
  if (group < suffixes.length) return n.div(Decimal.pow(10, group * 3)).toNumber().toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + suffixes[group];
  return n.mantissa.toFixed(2) + 'e' + n.exponent;
}
export const formatRate = (value: Decimal | number) => '+' + formatNumber(value, 2) + ' / sec';
export const formatTime = (seconds: number) => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');

