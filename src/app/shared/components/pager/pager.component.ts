import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Previous / Next footer for server-paged lists. */
@Component({
  selector: 'app-pager',
  standalone: true,
  template: `
    @if (total > 0) {
      <div class="pager">
        <span class="text-muted">Showing {{ first }}–{{ last }} of {{ total }}</span>
        @if (total > pageSize) {
          <div class="flex gap-8">
            <button type="button" class="btn btn-outline btn-sm" [disabled]="page <= 1" (click)="pageChange.emit(page - 1)">‹ Previous</button>
            <button type="button" class="btn btn-outline btn-sm" [disabled]="last >= total" (click)="pageChange.emit(page + 1)">Next ›</button>
          </div>
        }
      </div>
    }
  `
})
export class PagerComponent {
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<number>();

  get first(): number { return (this.page - 1) * this.pageSize + 1; }
  get last(): number { return Math.min(this.page * this.pageSize, this.total); }
}
