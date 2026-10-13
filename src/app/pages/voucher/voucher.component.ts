import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VoucherService } from '../../core/services/voucher.service';
import { CustomerService, SupplierService } from '../../core/services/master.service';
import { Customer, Supplier } from '../../core/models/master.model';
import { VoucherResponse } from '../../core/models/transactions.model';
import { defaultPagedRequest, PagedRequest } from '../../core/models/common.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-voucher',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './voucher.component.html'
})
export class VoucherComponent implements OnInit {
  private voucherService = inject(VoucherService);
  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  vouchers = signal<VoucherResponse[]>([]);
  totalCount = signal(0);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);

  customers = signal<Customer[]>([]);
  suppliers = signal<Supplier[]>([]);

  request: PagedRequest = { ...defaultPagedRequest };

  form = this.fb.group({
    voucherDate: [this.today(), Validators.required],
    voucherType: ['Receipt', Validators.required],
    partyType: ['Customer', Validators.required],
    customerId: [null as number | null],
    supplierId: [null as number | null],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMode: ['Cash', Validators.required],
    referenceNo: [''],
    narration: ['']
  });

  today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  ngOnInit(): void {
    this.customerService.getAll().subscribe((d) => this.customers.set(d));
    this.supplierService.getAll().subscribe((d) => this.suppliers.set(d));
    this.load();

    this.form.get('partyType')?.valueChanges.subscribe((val) => {
      if (val === 'Customer') {
        this.form.patchValue({ supplierId: null, voucherType: 'Receipt' });
      } else if (val === 'Supplier') {
        this.form.patchValue({ customerId: null, voucherType: 'Payment' });
      } else {
        this.form.patchValue({ customerId: null, supplierId: null });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.voucherService.getAll(this.request).subscribe({
      next: (res) => {
        this.vouchers.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  search(term: string): void {
    this.request.search = term || null;
    this.request.pageNumber = 1;
    this.load();
  }

  openCreate(): void {
    this.form.reset({
      voucherDate: this.today(),
      voucherType: 'Receipt',
      partyType: 'Customer',
      customerId: null,
      supplierId: null,
      amount: 0,
      paymentMode: 'Cash',
      referenceNo: '',
      narration: ''
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.partyType === 'Customer' && !v.customerId) {
      this.toast.error('Please select a customer.');
      return;
    }
    if (v.partyType === 'Supplier' && !v.supplierId) {
      this.toast.error('Please select a supplier.');
      return;
    }

    this.saving.set(true);
    this.voucherService.create(v as any).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(`Voucher ${res.voucherNo} created.`);
        this.showForm.set(false);
        this.load();
      },
      error: () => this.saving.set(false)
    });
  }

  cancelVoucher(v: VoucherResponse): void {
    if (!confirm(`Cancel Voucher ${v.voucherNo}? This will reverse the ledger entry.`)) return;
    this.voucherService.cancel(v.id).subscribe({
      next: () => { this.toast.success('Voucher cancelled.'); this.load(); }
    });
  }

  printVoucher(v: VoucherResponse): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/print/voucher', v.id]));
    window.open(url, '_blank');
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.vouchers().map((v) => ({
        'Voucher No': v.voucherNo, Date: v.voucherDate, Type: v.voucherType,
        Party: v.partyName, Amount: v.amount, Mode: v.paymentMode, Status: v.status
      })),
      `Voucher-List-${this.exportService.todayStamp()}`, 'Vouchers'
    );
  }
}
