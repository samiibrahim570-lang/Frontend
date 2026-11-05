const full = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export const formatFull = (n: number): string => full.format(n);
export const formatCompact = (n: number): string => compact.format(n);

/** Round axis maximum and evenly spaced ticks for a value range. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) max = min + 1;
  const rawStep = (max - min) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v < max + step * 0.999; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Percentage change against the previous period; null when there is no base to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Evenly thins x labels so they never collide. */
export function labelStep(count: number, width: number, labelWidth = 62): number {
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / labelWidth))));
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
