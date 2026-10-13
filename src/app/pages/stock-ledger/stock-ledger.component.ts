import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StockLedgerService } from '../../core/services/ledger.service';
import { ItemService } from '../../core/services/master.service';
import { Item } from '../../core/models/master.model';
import { ItemStockLedger } from '../../core/models/transactions.model';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-stock-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-ledger.component.html'
})
export class StockLedgerComponent implements OnInit {
  private stockLedgerService = inject(StockLedgerService);
  private itemService = inject(ItemService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  items = signal<Item[]>([]);
  selectedItemId: number | null = null;
  fromDate: string | null = null;
  toDate: string | null = null;

  report = signal<ItemStockLedger | null>(null);
  loading = signal(false);

  ngOnInit(): void {
    this.itemService.getAll().subscribe((d) => this.items.set(d));
  }

  view(): void {
    if (!this.selectedItemId) return;
    this.loading.set(true);
    this.stockLedgerService.getItemStockLedger(this.selectedItemId, this.fromDate, this.toDate).subscribe({
      next: (data) => { this.report.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  print(): void {
    if (!this.selectedItemId) return;
    const queryParams: any = {};
    if (this.fromDate) queryParams.from = this.fromDate;
    if (this.toDate) queryParams.to = this.toDate;
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/print/stock-ledger', this.selectedItemId], { queryParams })
    );
    window.open(url, '_blank');
  }

  exportExcel(): void {
    const r = this.report();
    if (!r) return;
    this.exportService.exportToExcel(
      r.entries.map((e) => ({
        Date: e.transactionDate, Movement: e.sourceType, 'Ref No': e.refNo,
        Narration: e.narration, In: e.inQty, Out: e.outQty, Balance: e.runningBalance
      })),
      `StockLedger-${r.itemName}-${this.exportService.todayStamp()}`, 'Stock Ledger'
    );
  }
}
