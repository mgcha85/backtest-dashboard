export function formatNumber(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals);
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function getValueClass(value: number | null): string {
  if (value === null || value === undefined) return 'neutral';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}
