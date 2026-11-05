import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { formatCompact, formatFull, labelStep, niceTicks } from './chart-format';

const PAD = { top: 12, right: 10, bottom: 28, left: 56 };
const MAX_BAR_WIDTH = 28;
const BAR_GAP = 2;
const RADIUS = 4;

/** Bars that rise above or fall below zero, for values that can go either way (e.g. net cash). */
@Component({
  selector: 'app-up-down-chart',
  standalone: true,
  template: `
    <div class="legend">
      <span><i class="up"></i>{{ upLabel }}</span>
      <span><i class="down"></i>{{ downLabel }}</span>
    </div>
    <div #box class="plot" [style.height.px]="height" role="img" [attr.aria-label]="ariaLabel" (pointerleave)="hover.set(null)">
      <svg [attr.width]="width()" [attr.height]="height">
        @for (t of ticks(); track t) {
          <line [class.zero]="t === 0" class="grid" [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="y(t)" [attr.y2]="y(t)" />
          <text class="tick" [attr.x]="left - 8" [attr.y]="y(t) + 4" text-anchor="end">{{ compact(t) }}</text>
        }
        @for (x of xLabels(); track x.i) {
          <text class="tick" [attr.x]="center(x.i)" [attr.y]="height - 8" text-anchor="middle">{{ x.label }}</text>
        }
        @for (v of values; track $index + '-' + version; let i = $index) {
          <path class="bar" [class.neg]="v < 0" [attr.d]="barPath(i, v)"
                [style.transform-origin]="'0 ' + y(0) + 'px'" [style.animation-delay]="(i * 22) + 'ms'"
                [style.opacity]="hover() === null || hover() === i ? 1 : 0.45" />
          <rect class="hit" [attr.x]="slotX(i)" [attr.y]="top" [attr.width]="slot()" [attr.height]="height - top - bottom" (pointerenter)="hover.set(i)" />
        }
      </svg>
      @if (hover() !== null) {
        <div class="tip" [class.flip]="center(hover()!) > width() * 0.6" [style.left.px]="center(hover()!)">
          <strong>{{ labels[hover()!] }}</strong>
          <div>{{ values[hover()!] >= 0 ? '▲' : '▼' }} {{ full(values[hover()!]) }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 8px; font-size: 12.5px; color: var(--color-text-soft); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    i { width: 10px; height: 10px; border-radius: 3px; }
    .up { background: var(--viz-up); } .down { background: var(--viz-down); }
    .plot { position: relative; }
    svg { display: block; overflow: visible; }
    .grid { stroke: var(--viz-grid); stroke-width: 1; }
    .grid.zero { stroke: var(--color-border-hover); }
    .tick { fill: var(--color-text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .bar { fill: var(--viz-up); animation: grow .7s cubic-bezier(.2,.7,.2,1) both; transition: opacity .12s; }
    .bar.neg { fill: var(--viz-down); }
    .hit { fill: transparent; }
    .tip { position: absolute; top: 2px; z-index: 2; padding: 8px 10px; font-size: 12px; white-space: nowrap; pointer-events: none; color: var(--color-text); background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 8px; box-shadow: var(--shadow-md); transform: translateX(12px); font-variant-numeric: tabular-nums; }
    .tip.flip { transform: translateX(calc(-100% - 12px)); }
    @keyframes grow { from { transform: scaleY(0); } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
  `]
})
export class UpDownChartComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) labels: string[] = [];
  @Input({ required: true }) values: number[] = [];
  @Input() upLabel = 'Up';
  @Input() downLabel = 'Down';
  @Input() height = 220;
  @Input() ariaLabel = 'Up and down bar chart';

  @ViewChild('box') set box(el: ElementRef<HTMLElement> | undefined) {
    this.observer?.disconnect();
    if (el) {
      this.observer = new ResizeObserver((entries) => this.width.set(Math.max(240, entries[0].contentRect.width)));
      this.observer.observe(el.nativeElement);
    }
  }

  readonly left = PAD.left;
  readonly right = PAD.right;
  readonly top = PAD.top;
  readonly bottom = PAD.bottom;
  readonly full = formatFull;
  readonly compact = formatCompact;

  width = signal(600);
  hover = signal<number | null>(null);
  private data = signal<number[]>([]);
  version = 0;
  private observer?: ResizeObserver;

  ticks = computed(() => niceTicks(Math.min(0, ...this.data()), Math.max(0, ...this.data(), 1)));
  slot = computed(() => (this.width() - PAD.left - PAD.right) / Math.max(1, this.data().length));
  xLabels = computed(() => {
    const step = labelStep(this.data().length, this.width() - PAD.left - PAD.right);
    return this.labels.map((label, i) => ({ label, i })).filter((x) => x.i % step === 0);
  });

  ngOnChanges(): void {
    this.version++;
    this.hover.set(null);
    this.data.set(this.values);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  slotX(i: number): number {
    return PAD.left + i * this.slot();
  }

  center(i: number): number {
    return this.slotX(i) + this.slot() / 2;
  }

  y(value: number): number {
    const ticks = this.ticks();
    const min = ticks[0];
    const max = ticks[ticks.length - 1];
    return PAD.top + (1 - (value - min) / (max - min)) * (this.height - PAD.top - PAD.bottom);
  }

  /** Square at the baseline, rounded at the data end. */
  barPath(i: number, value: number): string {
    if (value === 0) return '';
    const w = Math.max(2, Math.min(MAX_BAR_WIDTH, this.slot() - BAR_GAP));
    const x = this.center(i) - w / 2;
    const zero = this.y(0);
    const end = this.y(value);
    const r = Math.min(RADIUS, w / 2, Math.abs(end - zero));
    const dir = value > 0 ? 1 : -1;
    const sweep = value > 0 ? 1 : 0;
    return `M${x} ${zero} L${x} ${end + dir * r} A${r} ${r} 0 0 ${sweep} ${x + r} ${end} L${x + w - r} ${end} A${r} ${r} 0 0 ${sweep} ${x + w} ${end + dir * r} L${x + w} ${zero} Z`;
  }
}
