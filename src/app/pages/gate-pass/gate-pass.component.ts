import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  private route = inject(ActivatedRoute);
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

  // Local date (toISOString() is UTC and gives yesterday's date before 5 AM in PKT)
  today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.bookerService.getAll().subscribe((d) => this.bookers.set(d));
    this.load();

    this.form.get('gatePassType')?.valueChanges.subscribe(() => {
      this.selectedInvoiceIds.clear();
      this.loadAvailableInvoices();
    });

    // Opened from a Sale/Purchase invoice: /gate-pass?type=Sale&invoiceId=12 -> new Gate Pass with that invoice pre-selected
    const params = this.route.snapshot.queryParamMap;
    const invoiceId = Number(params.get('invoiceId'));
    const type = params.get('type') === 'Purchase' ? 'Purchase' : 'Sale';
    if (invoiceId > 0 && this.auth.canCreate('GATEPASS')) {
      this.openCreate(type, [invoiceId]);
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
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

  // Recent non-cancelled invoices of the selected type; pre-selected invoices outside that page are fetched and added
  loadAvailableInvoices(): void {
    const type = this.form.value.gatePassType;
    if (type === 'Sale') {
      this.saleService.getAll({ ...defaultPagedRequest, pageSize: 100 }).subscribe((res) => {
        const list = res.items.filter((s) => s.status !== 'Cancelled');
        this.availableSales.set(list);
        this.selectedInvoiceIds.forEach((id) => {
          if (!list.some((s) => s.id === id)) {
            this.saleService.getById(id).subscribe((s) => this.availableSales.update((cur) => [s, ...cur]));
          }
        });
      });
    } else {
      this.purchaseService.getAll({ ...defaultPagedRequest, pageSize: 100 }).subscribe((res) => {
        const list = res.items.filter((p) => p.status !== 'Cancelled');
        this.availablePurchases.set(list);
        this.selectedInvoiceIds.forEach((id) => {
          if (!list.some((p) => p.id === id)) {
            this.purchaseService.getById(id).subscribe((p) => this.availablePurchases.update((cur) => [p, ...cur]));
          }
        });
      });
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

  openCreate(type: 'Sale' | 'Purchase' = 'Sale', preselectedIds: number[] = []): void {
    // emitEvent: false so the type-change handler doesn't wipe the pre-selected invoices
    this.form.reset({
      gatePassNo: '',
      gatePassDate: this.today(),
      gatePassType: type,
      bookerId: null,
      driverName: '',
      vehicleNumber: '',
      remarks: ''
    }, { emitEvent: false });
    this.selectedInvoiceIds.clear();
    preselectedIds.forEach((id) => this.selectedInvoiceIds.add(id));
    this.loadAvailableInvoices();
    this.showForm.set(true);
    this.viewing.set(null);
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  save(confirm = true): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Gate Pass Date and Type are required.');
      return;
    }
    if (this.selectedInvoiceIds.size === 0) {
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
        confirm,
        invoiceIds: Array.from(this.selectedInvoiceIds)
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success(`Gate Pass ${res.gatePassNo} ${confirm ? 'created and confirmed' : 'saved as Draft'}.`);
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

  confirmGatePass(g: GatePassResponse): void {
    if (!confirm(`Confirm Gate Pass ${g.gatePassNo}?`)) return;
    this.gatePassService.confirm(g.id).subscribe({
      next: (res) => this.afterStatusChange(res, `Gate Pass ${res.gatePassNo} confirmed.`),
      error: () => {} // error toast is shown by errorInterceptor
    });
  }

  unconfirmGatePass(g: GatePassResponse): void {
    if (!confirm(`Unconfirm Gate Pass ${g.gatePassNo}? It will move back to Draft.`)) return;
    this.gatePassService.unconfirm(g.id).subscribe({
      next: (res) => this.afterStatusChange(res, `Gate Pass ${res.gatePassNo} moved back to Draft.`),
      error: () => {} // error toast is shown by errorInterceptor
    });
  }

  private afterStatusChange(res: GatePassResponse, message: string): void {
    this.toast.success(message);
    if (this.viewing()?.id === res.id) this.viewing.set(res);
    this.load();
  }

  cancelGatePass(g: GatePassResponse): void {
    if (!confirm(`Cancel Gate Pass ${g.gatePassNo}?`)) return;
    this.gatePassService.cancel(g.id).subscribe({
      next: () => { this.toast.success('Gate Pass cancelled.'); this.load(); this.closeView(); },
      error: () => {} // error toast is shown by errorInterceptor
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
