import { Component, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatCompact, formatFull } from './chart-format';

interface Segment { name: string; amount: number; share: number; offset: number; color: string; }

const SLOTS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-6)'];
const GAP = 0.6; // share of the ring left empty between segments

/** Part-to-whole ring with a legend that always shows the values. Keep to six segments or fewer. */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (segments().length === 0) {
      <p class="empty">No data for this period.</p>
    } @else {
      <div class="wrap">
        <div class="ring">
          <svg viewBox="0 0 42 42" role="img" [attr.aria-label]="ariaLabel" (pointerleave)="active.set(null)">
            <circle class="track" cx="21" cy="21" r="15.915" />
            @for (s of segments(); track s.name + version; let i = $index) {
              <circle class="seg" cx="21" cy="21" r="15.915" pathLength="100"
                      [style.stroke]="s.color"
                      [style.stroke-dasharray]="dash(s)"
                      [style.stroke-dashoffset]="-s.offset"
                      [style.animation-delay]="(i * 90) + 'ms'"
                      [style.opacity]="active() === null || active() === i ? 1 : 0.35"
                      (pointerenter)="active.set(i)" />
            }
          </svg>
          <div class="center">
            <strong>{{ compact(active() === null ? total() : segments()[active()!].amount) }}</strong>
            <span>{{ active() === null ? centerLabel : segments()[active()!].name }}</span>
          </div>
        </div>
        <ul class="legend">
          @for (s of segments(); track s.name; let i = $index) {
            <li (pointerenter)="active.set(i)" (pointerleave)="active.set(null)">
              <i [style.background]="s.color"></i>
              <span class="name" [title]="s.name">{{ s.name }}</span>
              <span class="val">{{ full(s.amount) }}</span>
              <span class="pct">{{ s.share | number: '1.0-1' }}%</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .empty { margin: 0; padding: 36px 0; text-align: center; font-size: 13px; color: var(--color-text-muted); }
    .wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; }
    .ring { position: relative; width: 168px; height: 168px; flex-shrink: 0; margin: 0 auto; }
    svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    circle { fill: none; stroke-width: 5.5; }
    .track { stroke: var(--color-hover); }
    .seg { animation: sweep .9s cubic-bezier(.2,.7,.2,1) both; transition: opacity .12s; }
    .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 34px; pointer-events: none; }
    .center strong { font-size: 19px; line-height: 1.2; }
    .center span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--color-text-muted); }
    .legend { flex: 1 1 200px; min-width: 0; margin: 0; padding: 0; list-style: none; font-size: 12.5px; }
    li { display: flex; align-items: center; gap: 8px; padding: 5px 4px; border-radius: 6px; }
    li:hover { background: var(--color-hover); }
    i { width: 10px; height: 10px; flex-shrink: 0; border-radius: 3px; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-soft); }
    .val, .pct { font-variant-numeric: tabular-nums; }
    .val { font-weight: 600; }
    .pct { width: 46px; text-align: right; color: var(--color-text-muted); }
    @keyframes sweep { from { stroke-dasharray: 0 100; } }
    @media (prefers-reduced-motion: reduce) { .seg { animation: none; } }
  `]
})
export class DonutChartComponent implements OnChanges {
  @Input({ required: true }) data: { name: string; amount: number }[] = [];
  @Input() centerLabel = 'Total';
  @Input() ariaLabel = 'Share by category';

  readonly full = formatFull;
  readonly compact = formatCompact;

  segments = signal<Segment[]>([]);
  total = signal(0);
  active = signal<number | null>(null);
  version = 0;

  ngOnChanges(): void {
    this.version++;
    this.active.set(null);
    const rows = this.data.filter((d) => d.amount > 0);
    const total = rows.reduce((sum, d) => sum + d.amount, 0);
    let offset = 0;
    this.segments.set(rows.map((d, i) => {
      const share = (d.amount / total) * 100;
      const segment = { name: d.name, amount: d.amount, share, offset, color: SLOTS[i % SLOTS.length] };
      offset += share;
      return segment;
    }));
    this.total.set(total);
  }

  dash(s: Segment): string {
    const length = this.segments().length > 1 ? Math.max(0.4, s.share - GAP) : s.share;
    return `${length} ${100 - length}`;
  }
}
