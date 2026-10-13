import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GatePassService } from '../../core/services/gate-pass.service';
import { SaleService } from '../../core/services/sale.service';
import { PurchaseService } from '../../core/services/purchase.service';
import { BookerService } from '../../core/services/master.service';
import { Booker } from '../../core/models/master.model';
import { SaleResponse, PurchaseResponse } from '../../core/models/sale-purchase.model';
import { GatePassResponse } from '../../core/models/transactions.model';
import { defaultPagedRequest, PagedRequest } from '../../core/models/common.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-gate-pass',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gate-pass.component.html'
})
export class GatePassComponent implements OnInit {
  private gatePassService = inject(GatePassService);
  private saleService = inject(SaleService);
  private purchaseService = inject(PurchaseService);
  private bookerService = inject(BookerService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  gatePasses = signal<GatePassResponse[]>([]);
  totalCount = signal(0);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  viewing = signal<GatePassResponse | null>(null);

  bookers = signal<Booker[]>([]);
  availableSales = signal<SaleResponse[]>([]);
  availablePurchases = signal<PurchaseResponse[]>([]);
  selectedInvoiceIds = new Set<number>();

  request: PagedRequest = { ...defaultPagedRequest };

  form = this.fb.group({
    gatePassNo: [''],
    gatePassDate: [this.today(), Validators.required],
    gatePassType: ['Sale', Validators.required],
    bookerId: [null as number | null],
    driverName: [''],
    vehicleNumber: [''],
    remarks: ['']
  });

  today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  ngOnInit(): void {
    this.bookerService.getAll().subscribe((d) => this.bookers.set(d));
    this.load();

    this.form.get('gatePassType')?.valueChanges.subscribe(() => {
      this.selectedInvoiceIds.clear();
      this.loadAvailableInvoices();
    });
  }

  load(): void {
    this.loading.set(true);
    this.gatePassService.getAll(this.request).subscribe({
      next: (res) => {
        this.gatePasses.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadAvailableInvoices(): void {
    const type = this.form.value.gatePassType;
    if (type === 'Sale') {
      this.saleService.getAll({ ...defaultPagedRequest, pageSize: 100 }).subscribe((res) => this.availableSales.set(res.items));
    } else {
      this.purchaseService.getAll({ ...defaultPagedRequest, pageSize: 100 }).subscribe((res) => this.availablePurchases.set(res.items));
    }
  }

  toggleInvoice(id: number): void {
    if (this.selectedInvoiceIds.has(id)) {
      this.selectedInvoiceIds.delete(id);
    } else {
      this.selectedInvoiceIds.add(id);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedInvoiceIds.has(id);
  }

  openCreate(): void {
    this.form.reset({
      gatePassNo: '',
      gatePassDate: this.today(),
      gatePassType: 'Sale',
      bookerId: null,
      driverName: '',
      vehicleNumber: '',
      remarks: ''
    });
    this.selectedInvoiceIds.clear();
    this.loadAvailableInvoices();
    this.showForm.set(true);
    this.viewing.set(null);
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    if (this.form.invalid || this.selectedInvoiceIds.size === 0) {
      this.form.markAllAsTouched();
      this.toast.error('Select at least one invoice to include in the Gate Pass.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.gatePassService
      .create({
        gatePassNo: v.gatePassNo || null,
        gatePassDate: v.gatePassDate!,
        gatePassType: v.gatePassType as 'Sale' | 'Purchase',
        bookerId: v.bookerId,
        driverName: v.driverName,
        vehicleNumber: v.vehicleNumber,
        remarks: v.remarks,
        invoiceIds: Array.from(this.selectedInvoiceIds)
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success(`Gate Pass ${res.gatePassNo} created.`);
          this.showForm.set(false);
          this.load();
        },
        error: () => this.saving.set(false)
      });
  }

  view(g: GatePassResponse): void {
    this.gatePassService.getById(g.id).subscribe((data) => {
      this.viewing.set(data);
      this.showForm.set(false);
    });
  }

  closeView(): void {
    this.viewing.set(null);
  }

  print(): void {
    const g = this.viewing();
    if (!g) return;
    this.openPrintWindow(g.id);
  }

  printFromList(g: GatePassResponse): void {
    this.openPrintWindow(g.id);
  }

  private openPrintWindow(id: number): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/print/gate-pass', id]));
    window.open(url, '_blank');
  }

  cancelGatePass(g: GatePassResponse): void {
    if (!confirm(`Cancel Gate Pass ${g.gatePassNo}?`)) return;
    this.gatePassService.cancel(g.id).subscribe({
      next: () => { this.toast.success('Gate Pass cancelled.'); this.load(); this.closeView(); }
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.gatePasses().map((g) => ({
        'Gate Pass No': g.gatePassNo, Date: g.gatePassDate, Type: g.gatePassType,
        Booker: g.bookerName, Driver: g.driverName, Vehicle: g.vehicleNumber,
        'Total Invoices': g.totalInvoices, 'Total Qty': g.grandTotalQuantity,
        'Total Amount': g.grandTotalAmount, Status: g.status
      })),
      `GatePass-List-${this.exportService.todayStamp()}`, 'Gate Passes'
    );
  }
}
