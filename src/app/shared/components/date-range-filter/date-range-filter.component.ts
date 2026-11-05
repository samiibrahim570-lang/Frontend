import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { DATE_PRESETS, DatePresetId, DateRange } from '../../../core/utils/date.util';

/** From / To filter with quick presets, used above every date-based list and on the dashboard. */
@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  template: `
    <div class="date-filter" role="group" aria-label="Filter by date">
      <div class="date-presets">
        @for (p of visiblePresets; track p.id) {
          <button type="button" class="date-preset" [class.active]="activePreset() === p.id"
                  [attr.aria-pressed]="activePreset() === p.id" (click)="applyPreset(p.id)">{{ p.label }}</button>
        }
      </div>
      <div class="date-inputs">
        <label>
          <span>From</span>
          <input type="date" [value]="from() ?? ''" [max]="to() ?? ''" (change)="onFrom($any($event.target).value)" />
        </label>
        <label>
          <span>To</span>
          <input type="date" [value]="to() ?? ''" [min]="from() ?? ''" (change)="onTo($any($event.target).value)" />
        </label>
      </div>
      @if (invalid()) { <span class="date-error" role="alert">From Date cannot be after To Date.</span> }
    </div>
  `
})
export class DateRangeFilterComponent implements OnInit {
  /** Selected when the component loads. Lists default to 'all' so no record is hidden until the user filters. */
  @Input() preset: DatePresetId = 'all';
  /** Dashboard needs a real period, so it hides the 'All' option. */
  @Input() allowAll = true;
  @Output() rangeChange = new EventEmitter<DateRange>();

  from = signal<string | null>(null);
  to = signal<string | null>(null);
  activePreset = signal<DatePresetId | null>('all');
  invalid = signal(false);

  get visiblePresets() {
    return this.allowAll ? DATE_PRESETS : DATE_PRESETS.filter((p) => p.id !== 'all');
  }

  ngOnInit(): void {
    const range = DATE_PRESETS.find((p) => p.id === this.preset)!.range();
    this.from.set(range.from);
    this.to.set(range.to);
    this.activePreset.set(this.preset);
  }

  applyPreset(id: DatePresetId): void {
    const range = DATE_PRESETS.find((p) => p.id === id)!.range();
    this.from.set(range.from);
    this.to.set(range.to);
    this.activePreset.set(id);
    this.invalid.set(false);
    this.rangeChange.emit(range);
  }

  onFrom(value: string): void {
    this.from.set(value || null);
    this.emitCustom();
  }

  onTo(value: string): void {
    this.to.set(value || null);
    this.emitCustom();
  }

  private emitCustom(): void {
    this.activePreset.set(null);
    const from = this.from();
    const to = this.to();
    const invalid = !!from && !!to && from > to;
    this.invalid.set(invalid);
    if (!invalid) this.rangeChange.emit({ from, to });
  }
}
