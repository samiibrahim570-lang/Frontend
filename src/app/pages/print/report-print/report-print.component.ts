import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReportService } from '../../../core/services/report.service';
import {
  ProductionReportItem,
  PurchaseReportItem,
  ReturnReportItem,
  SaleReportItem,
  StockReportItem
} from '../../../core/models/transactions.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrintLetterheadComponent } from '../../../shared/components/print-letterhead/print-letterhead.component';
import { TenantService } from '../../../core/services/tenant.service';

type ReportKind = 'sale' | 'purchase' | 'salereturn' | 'purchasereturn' | 'production' | 'stock';

@Component({
  selector: 'app-report-print',
  standalone: true,
  imports: [CommonModule, IconComponent, PrintLetterheadComponent],
  templateUrl: './report-print.component.html'
})
export class ReportPrintComponent implements OnInit {
  private tenant = inject(TenantService);
  private route = inject(ActivatedRoute);
  private reportService = inject(ReportService);

  kind = signal<ReportKind>('sale');
  loading = signal(true);
  fromDate: string | null = null;
  toDate: string | null = null;

  saleRows = signal<SaleReportItem[]>([]);
  purchaseRows = signal<PurchaseReportItem[]>([]);
  productionRows = signal<ProductionReportItem[]>([]);
  stockRows = signal<StockReportItem[]>([]);
  returnRows = signal<ReturnReportItem[]>([]);

  ngOnInit(): void {
    const kind = (this.route.snapshot.paramMap.get('type') || 'sale') as ReportKind;
    this.kind.set(kind);
    this.fromDate = this.route.snapshot.queryParamMap.get('from');
    this.toDate = this.route.snapshot.queryParamMap.get('to');

    const done = () => {
      this.loading.set(false);
      this.tenant.letterhead().subscribe(() => setTimeout(() => window.print(), 500));
    };

    if (kind === 'sale') {
      this.reportService.getSaleReport(this.fromDate, this.toDate).subscribe({ next: (d) => { this.saleRows.set(d); done(); }, error: () => this.loading.set(false) });
    } else if (kind === 'purchase') {
      this.reportService.getPurchaseReport(this.fromDate, this.toDate).subscribe({ next: (d) => { this.purchaseRows.set(d); done(); }, error: () => this.loading.set(false) });
    } else if (kind === 'salereturn' || kind === 'purchasereturn') {
      this.reportService.getReturnReport(kind === 'salereturn' ? 'sale' : 'purchase', this.fromDate, this.toDate)
        .subscribe({ next: (d) => { this.returnRows.set(d); done(); }, error: () => this.loading.set(false) });
    } else if (kind === 'production') {
      this.reportService.getProductionReport(this.fromDate, this.toDate).subscribe({ next: (d) => { this.productionRows.set(d); done(); }, error: () => this.loading.set(false) });
    } else {
      this.reportService.getStockReport(false).subscribe({ next: (d) => { this.stockRows.set(d); done(); }, error: () => this.loading.set(false) });
    }
  }

  saleTotal(): number { return this.saleRows().reduce((s, r) => s + r.netAmount, 0); }
  purchaseTotal(): number { return this.purchaseRows().reduce((s, r) => s + r.netAmount, 0); }
  saleReturnsTotal(): number { return this.saleRows().reduce((s, r) => s + (r.returnAmount || 0), 0); }
  purchaseReturnsTotal(): number { return this.purchaseRows().reduce((s, r) => s + (r.returnAmount || 0), 0); }
  returnTotal(field: 'netAmount' | 'refundAmount' | 'balanceAmount'): number { return this.returnRows().reduce((s, r) => s + r[field], 0); }

  title(): string {
    return {
      sale: 'Sale Report',
      purchase: 'Purchase Report',
      salereturn: 'Sale Return Report',
      purchasereturn: 'Purchase Return Report',
      production: 'Production / Pisai Report',
      stock: 'Stock Report'
    }[this.kind()];
  }

  print(): void { window.print(); }
  close(): void { window.close(); }
}
