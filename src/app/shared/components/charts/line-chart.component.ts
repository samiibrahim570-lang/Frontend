import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { formatCompact, formatFull, labelStep, niceTicks } from './chart-format';

export interface LineSeries { name: string; color: string; values: number[]; }

const PAD = { top: 14, right: 14, bottom: 28, left: 56 };

/** Animated multi-series line chart: crosshair tooltip, keyboard support and a table view. */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `
    <div class="head">
      <div class="legend">
        @for (s of series; track s.name) { <span><i [style.background]="s.color"></i>{{ s.name }}</span> }
      </div>
      <button type="button" class="view-toggle" (click)="showTable.set(!showTable())">{{ showTable() ? 'View chart' : 'View table' }}</button>
    </div>

    @if (showTable()) {
      <div class="table-wrap table-scroll">
        <table>
          <thead><tr><th>Period</th>@for (s of series; track s.name) { <th class="text-right">{{ s.name }}</th> }</tr></thead>
          <tbody>
            @for (label of labels; track $index; let i = $index) {
              <tr><td>{{ label }}</td>@for (s of series; track s.name) { <td class="text-right num">{{ full(s.values[i]) }}</td> }</tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div #box class="plot" [style.height.px]="height" tabindex="0" role="img" [attr.aria-label]="ariaLabel"
           (pointermove)="onPointer($event)" (pointerleave)="hover.set(null)" (blur)="hover.set(null)" (keydown)="onKey($event)">
        <svg [attr.width]="width()" [attr.height]="height">
          @for (t of ticks(); track t) {
            <line class="grid" [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="y(t)" [attr.y2]="y(t)" />
            <text class="tick" [attr.x]="left - 8" [attr.y]="y(t) + 4" text-anchor="end">{{ compact(t) }}</text>
          }
          @for (x of xLabels(); track x.i) {
            <text class="tick" [attr.x]="px(x.i)" [attr.y]="height - 8" text-anchor="middle">{{ x.label }}</text>
          }
          @for (s of series; track s.name + version) {
            <path class="area" [attr.d]="areaPath(s)" [style.fill]="s.color" />
            <path class="line" pathLength="1" [attr.d]="linePath(s)" [style.stroke]="s.color" />
            @if (labels.length === 1) { <circle [attr.cx]="px(0)" [attr.cy]="y(s.values[0])" r="4" [style.fill]="s.color" /> }
          }
          @if (hover() !== null) {
            <line class="cross" [attr.x1]="px(hover()!)" [attr.x2]="px(hover()!)" [attr.y1]="top" [attr.y2]="height - bottom" />
            @for (s of series; track s.name) {
              <circle class="dot" [attr.cx]="px(hover()!)" [attr.cy]="y(s.values[hover()!])" r="4.5" [style.fill]="s.color" />
            }
          }
        </svg>
        @if (hover() !== null) {
          <div class="tip" [class.flip]="px(hover()!) > width() * 0.6" [style.left.px]="px(hover()!)">
            <strong>{{ labels[hover()!] }}</strong>
            @for (s of series; track s.name) {
              <div class="tip-row"><i [style.background]="s.color"></i><span>{{ s.name }}</span><b>{{ full(s.values[hover()!]) }}</b></div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12.5px; color: var(--color-text-soft); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    i { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .view-toggle { padding: 0; font: inherit; font-size: 12px; color: var(--color-text-muted); background: none; border: none; cursor: pointer; text-decoration: underline; }
    .plot { position: relative; outline: none; border-radius: 8px; touch-action: pan-y; }
    .plot:focus-visible { box-shadow: var(--focus-ring); }
    svg { display: block; overflow: visible; }
    .grid { stroke: var(--viz-grid); stroke-width: 1; }
    .tick { fill: var(--color-text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 1; animation: draw 1.1s ease-out both; }
    .area { opacity: .1; animation: fade 1.1s ease-out both; }
    .cross { stroke: var(--color-border-hover); stroke-width: 1; }
    .dot { stroke: var(--color-surface); stroke-width: 2; }
    .tip { position: absolute; top: 4px; z-index: 2; min-width: 170px; padding: 8px 10px; font-size: 12px; pointer-events: none; color: var(--color-text); background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 8px; box-shadow: var(--shadow-md); transform: translateX(12px); }
    .tip.flip { transform: translateX(calc(-100% - 12px)); }
    .tip-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .tip-row span { flex: 1; color: var(--color-text-soft); }
    .tip-row b { font-variant-numeric: tabular-nums; }
    .num { font-variant-numeric: tabular-nums; }
    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes fade { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .line, .area { animation: none; } }
  `]
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) labels: string[] = [];
  @Input({ required: true }) series: LineSeries[] = [];
  @Input() height = 260;
  @Input() ariaLabel = 'Line chart';

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
  showTable = signal(false);
  private data = signal<LineSeries[]>([]);
  private count = signal(0);
  /** Changes with the data so the line-draw animation replays. */
  version = 0;
  private observer?: ResizeObserver;

  ticks = computed(() => {
    const max = Math.max(0, ...this.data().flatMap((s) => s.values));
    const min = Math.min(0, ...this.data().flatMap((s) => s.values));
    return niceTicks(min, max || 1);
  });
  xLabels = computed(() => {
    const step = labelStep(this.count(), this.width() - PAD.left - PAD.right);
    return this.labels.map((label, i) => ({ label, i })).filter((x) => x.i % step === 0);
  });

  ngAfterViewInit(): void {}

  ngOnChanges(): void {
    this.version++;
    this.hover.set(null);
    this.data.set(this.series);
    this.count.set(this.labels.length);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  px(i: number): number {
    const span = this.width() - PAD.left - PAD.right;
    return this.labels.length <= 1 ? PAD.left + span / 2 : PAD.left + (i / (this.labels.length - 1)) * span;
  }

  y(value: number): number {
    const ticks = this.ticks();
    const min = ticks[0];
    const max = ticks[ticks.length - 1];
    return PAD.top + (1 - (value - min) / (max - min)) * (this.height - PAD.top - PAD.bottom);
  }

  linePath(s: LineSeries): string {
    return s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${this.px(i)} ${this.y(v)}`).join(' ');
  }

  areaPath(s: LineSeries): string {
    if (s.values.length < 2) return '';
    const base = this.y(Math.max(0, this.ticks()[0]));
    return `${this.linePath(s)} L${this.px(s.values.length - 1)} ${base} L${this.px(0)} ${base} Z`;
  }

  onPointer(event: PointerEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const span = this.width() - PAD.left - PAD.right;
    const i = Math.round(((event.clientX - rect.left - PAD.left) / span) * (this.labels.length - 1));
    this.hover.set(Math.max(0, Math.min(this.labels.length - 1, i || 0)));
  }

  onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const current = this.hover() ?? (delta > 0 ? -1 : this.labels.length);
    this.hover.set(Math.max(0, Math.min(this.labels.length - 1, current + delta)));
  }
}
