import { Component, Input, computed, signal } from '@angular/core';
import { formatFull, percentChange } from './chart-format';

export interface RankRow { name: string; value: number; previous?: number | null; note?: string | null; }

/** Ranked horizontal bars, best first, each with its value and up/down change against the previous period. */
@Component({
  selector: 'app-rank-bars',
  standalone: true,
  template: `
    @if (rows().length === 0) {
      <p class="empty">No data for this period.</p>
    } @else {
      <ol>
        @for (r of rows(); track r.name; let i = $index) {
          <li>
            <div class="line">
              <span class="rank">{{ i + 1 }}</span>
              <span class="name" [title]="r.name">{{ r.name }}</span>
              @if (r.note) { <span class="note">{{ r.note }}</span> }
              <span class="value">{{ full(r.value) }}</span>
              @if (showChange) {
                @if (change(r); as c) {
                  <span class="delta" [class.up]="c.up" [class.down]="!c.up">{{ c.up ? '▲' : '▼' }} {{ c.text }}</span>
                } @else {
                  <span class="delta">New</span>
                }
              }
            </div>
            <div class="track"><div class="bar" [style.width.%]="percent(r)" [style.background]="color" [style.animation-delay]="(i * 50) + 'ms'"></div></div>
          </li>
        }
      </ol>
    }
  `,
  styles: [`
    :host { display: block; }
    .empty { margin: 0; padding: 36px 0; text-align: center; font-size: 13px; color: var(--color-text-muted); }
    ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 11px; }
    .line { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; font-size: 13px; }
    .rank { width: 16px; flex-shrink: 0; font-size: 11.5px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .note { flex-shrink: 0; font-size: 11.5px; color: var(--color-text-muted); }
    .value { flex-shrink: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
    .delta { flex-shrink: 0; width: 66px; text-align: right; font-size: 11.5px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
    .delta.up { color: var(--color-success); }
    .delta.down { color: var(--color-danger); }
    .track { height: 7px; margin-left: 24px; border-radius: 4px; background: var(--color-hover); overflow: hidden; }
    .bar { height: 100%; border-radius: 4px; transform-origin: left; animation: grow .8s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes grow { from { transform: scaleX(0); } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
  `]
})
export class RankBarsComponent {
  @Input({ required: true }) set data(value: RankRow[]) { this.rows.set(value); }
  @Input() showChange = true;
  @Input() color = 'var(--viz-1)';

  readonly full = formatFull;
  rows = signal<RankRow[]>([]);
  private max = computed(() => Math.max(1, ...this.rows().map((r) => r.value)));

  percent(r: RankRow): number {
    return Math.max(0, (r.value / this.max()) * 100);
  }

  change(r: RankRow): { up: boolean; text: string } | null {
    const pct = percentChange(r.value, r.previous ?? 0);
    if (pct === null) return null;
    const rounded = Math.abs(pct) >= 1000 ? '999+' : Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0);
    return { up: pct >= 0, text: `${rounded}%` };
  }
}
