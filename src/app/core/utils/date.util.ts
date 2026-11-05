/** yyyy-MM-dd in the user's local time (toISOString() is UTC and can give yesterday's date). */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DateRange {
  from: string | null;
  to: string | null;
}

export type DatePresetId = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all';

export interface DatePreset {
  id: DatePresetId;
  label: string;
  range: () => DateRange;
}

function daysBack(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - days);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export const DATE_PRESETS: DatePreset[] = [
  { id: 'today', label: 'Today', range: () => daysBack(0) },
  { id: 'last7', label: '7 days', range: () => daysBack(6) },
  { id: 'last30', label: '30 days', range: () => daysBack(29) },
  {
    id: 'thisMonth',
    label: 'This month',
    range: () => {
      const now = new Date();
      return { from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toIsoDate(now) };
    }
  },
  {
    id: 'lastMonth',
    label: 'Last month',
    range: () => {
      const now = new Date();
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 0))
      };
    }
  },
  {
    id: 'thisYear',
    label: 'This year',
    range: () => {
      const now = new Date();
      return { from: toIsoDate(new Date(now.getFullYear(), 0, 1)), to: toIsoDate(now) };
    }
  },
  { id: 'all', label: 'All', range: () => ({ from: null, to: null }) }
];
