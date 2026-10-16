import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StockLedgerService } from '../../../core/services/ledger.service';
import { ItemStockLedger } from '../../../core/models/transactions.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrintLetterheadComponent } from '../../../shared/components/print-letterhead/print-letterhead.component';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'app-stock-ledger-print',
  standalone: true,
  imports: [CommonModule, IconComponent, PrintLetterheadComponent],
  templateUrl: './stock-ledger-print.component.html'
})
export class StockLedgerPrintComponent implements OnInit {
  private tenant = inject(TenantService);
  private route = inject(ActivatedRoute);
  private stockLedgerService = inject(StockLedgerService);

  report = signal<ItemStockLedger | null>(null);
  loading = signal(true);
  fromDate: string | null = null;
  toDate: string | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.fromDate = this.route.snapshot.queryParamMap.get('from');
    this.toDate = this.route.snapshot.queryParamMap.get('to');

    this.stockLedgerService.getItemStockLedger(id, this.fromDate, this.toDate).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
        this.tenant.letterhead().subscribe(() => setTimeout(() => window.print(), 500));
      },
      error: () => this.loading.set(false)
    });
  }

  print(): void { window.print(); }
  close(): void { window.close(); }
}
