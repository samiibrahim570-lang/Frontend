import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReportService } from '../../core/services/report.service';
import { ExportService } from '../../core/services/export.service';
import { SaleService } from '../../core/services/sale.service';
import { PurchaseService } from '../../core/services/purchase.service';
import { ProductionService } from '../../core/services/production.service';
import { VoucherService } from '../../core/services/voucher.service';
import { LedgerService } from '../../core/services/ledger.service';
import {
  CategoryService,
  CustomerService,
  ItemService,
  SupplierService,
  BookerService
} from '../../core/services/master.service';
import {
  ProductionReportItem,
  PurchaseReportItem,
  SaleReportItem,
  StockReportItem
} from '../../core/models/transactions.model';
import { defaultPagedRequest } from '../../core/models/common.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

type ReportTab = 'sale' | 'purchase' | 'production' | 'stock';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html'
})
export class ReportsComponent {
  private reportService = inject(ReportService);
  private exportService = inject(ExportService);
  private router = inject(Router);
  private saleService = inject(SaleService);
  private purchaseService = inject(PurchaseService);
  private productionService = inject(ProductionService);
  private voucherService = inject(VoucherService);
  private ledgerService = inject(LedgerService);
  private categoryService = inject(CategoryService);
  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);
  private itemService = inject(ItemService);
  private bookerService = inject(BookerService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  activeTab = signal<ReportTab>('sale');
  loading = signal(false);
  exportingAll = signal(false);

  fromDate: string | null = null;
  toDate: string | null = null;
  lowStockOnly = false;

  saleReport = signal<SaleReportItem[]>([]);
  purchaseReport = signal<PurchaseReportItem[]>([]);
  productionReport = signal<ProductionReportItem[]>([]);
  stockReport = signal<StockReportItem[]>([]);

  setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    this.run();
  }

  run(): void {
    this.loading.set(true);
    const tab = this.activeTab();

    if (tab === 'sale') {
      this.reportService.getSaleReport(this.fromDate, this.toDate).subscribe({
        next: (d) => { this.saleReport.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else if (tab === 'purchase') {
      this.reportService.getPurchaseReport(this.fromDate, this.toDate).subscribe({
        next: (d) => { this.purchaseReport.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else if (tab === 'production') {
      this.reportService.getProductionReport(this.fromDate, this.toDate).subscribe({
        next: (d) => { this.productionReport.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else {
      this.reportService.getStockReport(this.lowStockOnly).subscribe({
        next: (d) => { this.stockReport.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    }
  }

  print(): void {
    const tab = this.activeTab();
    const queryParams: any = {};
    if (tab !== 'stock') {
      if (this.fromDate) queryParams.from = this.fromDate;
      if (this.toDate) queryParams.to = this.toDate;
    }
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/print/report', tab], { queryParams })
    );
    window.open(url, '_blank');
  }

  saleTotal(): number {
    return this.saleReport().reduce((sum, r) => sum + r.netAmount, 0);
  }
  purchaseTotal(): number {
    return this.purchaseReport().reduce((sum, r) => sum + r.netAmount, 0);
  }

  // Export just the currently active report tab
  exportCurrentTab(): void {
    const tab = this.activeTab();
    const stamp = this.exportService.todayStamp();

    if (tab === 'sale') {
      this.exportService.exportToExcel(
        this.saleReport().map((r) => ({
          Date: r.invoiceDate, 'Invoice No': r.invoiceNo, Customer: r.customerName,
          'Net Amount': r.netAmount, Paid: r.paidAmount, Balance: r.balanceAmount
        })),
        `Sale-Report-${stamp}`, 'Sale Report'
      );
    } else if (tab === 'purchase') {
      this.exportService.exportToExcel(
        this.purchaseReport().map((r) => ({
          Date: r.invoiceDate, 'Invoice No': r.invoiceNo, Supplier: r.supplierName,
          'Net Amount': r.netAmount, Paid: r.paidAmount, Balance: r.balanceAmount
        })),
        `Purchase-Report-${stamp}`, 'Purchase Report'
      );
    } else if (tab === 'production') {
      this.exportService.exportToExcel(
        this.productionReport().map((r) => ({
          Date: r.productionDate, 'Production No': r.productionNo,
          'Raw Material Qty': r.totalRawMaterialQty, 'Output Qty': r.totalOutputQty, Wastage: r.wastageQty
        })),
        `Production-Report-${stamp}`, 'Production Report'
      );
    } else {
      this.exportService.exportToExcel(
        this.stockReport().map((r) => ({
          Code: r.itemCode, Item: r.itemName, Category: r.categoryName, UOM: r.unitOfMeasure,
          'Opening Stock': r.openingStock, 'Current Stock': r.currentStock, 'Reorder Level': r.reorderLevel
        })),
        `Stock-Report-${stamp}`, 'Stock Report'
      );
    }
  }

  // Export the ENTIRE application's data into one multi-sheet Excel workbook
  exportWholeApplication(): void {
    this.exportingAll.set(true);
    const bigPage = { ...defaultPagedRequest, pageSize: 5000 };

    forkJoin({
      sales: this.saleService.getAll(bigPage),
      purchases: this.purchaseService.getAll(bigPage),
      productions: this.productionService.getAll(bigPage),
      vouchers: this.voucherService.getAll(bigPage),
      customers: this.customerService.getAll(),
      suppliers: this.supplierService.getAll(),
      bookers: this.bookerService.getAll(),
      categories: this.categoryService.getAll(),
      items: this.itemService.getAll(),
      customerBalances: this.ledgerService.getCustomerBalances(),
      supplierBalances: this.ledgerService.getSupplierBalances()
    }).subscribe({
      next: (r) => {
        this.exportingAll.set(false);
        this.exportService.exportMultiSheet(
          [
            {
              name: 'Sales', data: r.sales.items.map((s) => ({
                'Invoice No': s.invoiceNo, Date: s.invoiceDate, Customer: s.customerName, Booker: s.bookerName,
                Driver: s.driverName, Vehicle: s.vehicleNumber, 'Net Amount': s.netAmount,
                Paid: s.paidAmount, Balance: s.balanceAmount, Status: s.status
              }))
            },
            {
              name: 'Purchases', data: r.purchases.items.map((p) => ({
                'Invoice No': p.invoiceNo, Date: p.invoiceDate, Supplier: p.supplierName,
                Driver: p.driverName, Vehicle: p.vehicleNumber, 'Net Amount': p.netAmount,
                Paid: p.paidAmount, Balance: p.balanceAmount, Status: p.status
              }))
            },
            {
              name: 'Production', data: r.productions.items.map((p) => ({
                'Production No': p.productionNo, Date: p.productionDate,
                'Raw Material Qty': p.totalRawMaterialQty, 'Output Qty': p.totalOutputQty,
                Wastage: p.wastageQty, Status: p.status
              }))
            },
            {
              name: 'Vouchers', data: r.vouchers.items.map((v) => ({
                'Voucher No': v.voucherNo, Date: v.voucherDate, Type: v.voucherType,
                Party: v.partyName, Amount: v.amount, Mode: v.paymentMode, Status: v.status
              }))
            },
            {
              name: 'Customers', data: r.customers.map((c) => ({
                Code: c.code, Name: c.name, Phone: c.phone, City: c.city,
                'Opening Balance': c.openingBalance, 'Current Balance': c.currentBalance
              }))
            },
            {
              name: 'Suppliers', data: r.suppliers.map((s) => ({
                Code: s.code, Name: s.name, Phone: s.phone, City: s.city,
                'Opening Balance': s.openingBalance, 'Current Balance': s.currentBalance
              }))
            },
            { name: 'Bookers', data: r.bookers.map((b) => ({ Code: b.code, Name: b.name, Phone: b.phone, 'Commission %': b.commissionPercent })) },
            { name: 'Categories', data: r.categories.map((c) => ({ Name: c.categoryName, Description: c.description })) },
            {
              name: 'Items', data: r.items.map((i) => ({
                Code: i.itemCode, Name: i.itemName, Category: i.categoryName, UOM: i.unitOfMeasure,
                'Raw Material': i.isRawMaterial ? 'Yes' : 'No', 'Finished Good': i.isFinishedGood ? 'Yes' : 'No',
                'Current Stock': i.currentStock, 'Purchase Price': i.purchasePrice, 'Sale Price': i.salePrice
              }))
            },
            { name: 'Customer Balances', data: r.customerBalances.map((b) => ({ Code: b.code, Name: b.name, Opening: b.openingBalance, Current: b.currentBalance })) },
            { name: 'Supplier Balances', data: r.supplierBalances.map((b) => ({ Code: b.code, Name: b.name, Opening: b.openingBalance, Current: b.currentBalance })) }
          ],
          `FishFeedMill-Full-Export-${this.exportService.todayStamp()}`
        );
        this.toast.success('Full application export downloaded.');
      },
      error: () => {
        this.exportingAll.set(false);
        this.toast.error('Failed to export. Please try again.');
      }
    });
  }
}
