import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PurchaseService } from '../../core/services/purchase.service';
import { SupplierService, ItemService } from '../../core/services/master.service';
import { Supplier, Item } from '../../core/models/master.model';
import { PurchaseResponse } from '../../core/models/sale-purchase.model';
import { defaultPagedRequest, PagedRequest } from '../../core/models/common.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './purchase.component.html'
})
export class PurchaseComponent implements OnInit {
  private purchaseService = inject(PurchaseService);
  private supplierService = inject(SupplierService);
  private itemService = inject(ItemService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  purchases = signal<PurchaseResponse[]>([]);
  totalCount = signal(0);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  viewing = signal<PurchaseResponse | null>(null);

  suppliers = signal<Supplier[]>([]);
  items = signal<Item[]>([]);

  request: PagedRequest = { ...defaultPagedRequest };

  form = this.fb.group({
    invoiceNo: [''],
    invoiceDate: [this.today(), Validators.required],
    supplierId: [null as number | null, Validators.required],
    driverName: [''],
    vehicleNumber: [''],
    discountAmount: [0],
    taxAmount: [0],
    paidAmount: [0],
    remarks: [''],
    items: this.fb.array([])
  });

  get itemRows(): FormArray {
    return this.form.get('items') as FormArray;
  }

  today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  ngOnInit(): void {
    this.supplierService.getAll().subscribe((d) => this.suppliers.set(d));
    this.itemService.getAll().subscribe((d) => this.items.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.purchaseService.getAll(this.request).subscribe({
      next: (res) => {
        this.purchases.set(res.items);
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

  newItemRow() {
    return this.fb.group({
      itemId: [null as number | null, Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.001)]],
      rate: [0, [Validators.required, Validators.min(0)]],
      discountAmount: [0]
    });
  }

  addItemRow(): void {
    this.itemRows.push(this.newItemRow());
  }

  removeItemRow(i: number): void {
    this.itemRows.removeAt(i);
  }

  lineTotal(i: number): number {
    const row = this.itemRows.at(i).getRawValue();
    return (row.quantity || 0) * (row.rate || 0) - (row.discountAmount || 0);
  }

  itemsSubTotal(): number {
    let sum = 0;
    for (let i = 0; i < this.itemRows.length; i++) sum += this.lineTotal(i);
    return sum;
  }

  netAmount(): number {
    const v = this.form.getRawValue();
    return this.itemsSubTotal() - (v.discountAmount || 0) + (v.taxAmount || 0);
  }

  balanceAmount(): number {
    const v = this.form.getRawValue();
    return this.netAmount() - (v.paidAmount || 0);
  }

  openCreate(): void {
    this.form.reset({
      invoiceNo: '',
      invoiceDate: this.today(),
      supplierId: null,
      driverName: '',
      vehicleNumber: '',
      discountAmount: 0,
      taxAmount: 0,
      paidAmount: 0,
      remarks: ''
    });
    this.itemRows.clear();
    this.addItemRow();
    this.showForm.set(true);
    this.viewing.set(null);
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    if (this.form.invalid || this.itemRows.length === 0) {
      this.form.markAllAsTouched();
      this.toast.error('Please fill supplier and at least one item line.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.purchaseService
      .create({
        invoiceNo: v.invoiceNo || null,
        invoiceDate: v.invoiceDate!,
        supplierId: v.supplierId!,
        driverName: v.driverName,
        vehicleNumber: v.vehicleNumber,
        discountAmount: v.discountAmount || 0,
        taxAmount: v.taxAmount || 0,
        paidAmount: v.paidAmount || 0,
        remarks: v.remarks,
        items: v.items as any
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success(`Purchase invoice ${res.invoiceNo} created.`);
          this.showForm.set(false);
          this.load();
        },
        error: () => this.saving.set(false)
      });
  }

  view(p: PurchaseResponse): void {
    this.viewing.set(p);
    this.showForm.set(false);
  }

  closeView(): void {
    this.viewing.set(null);
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.purchases().map((p) => ({
        'Invoice No': p.invoiceNo, Date: p.invoiceDate, Supplier: p.supplierName,
        Driver: p.driverName, Vehicle: p.vehicleNumber, 'Net Amount': p.netAmount,
        Paid: p.paidAmount, Balance: p.balanceAmount, Status: p.status
      })),
      `Purchase-List-${this.exportService.todayStamp()}`, 'Purchases'
    );
  }

  printInvoice(p: PurchaseResponse): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/print/purchase', p.id]));
    window.open(url, '_blank');
  }

  // Opens a new Gate Pass with this invoice pre-selected
  createGatePass(p: PurchaseResponse): void {
    this.router.navigate(['/gate-pass'], { queryParams: { type: 'Purchase', invoiceId: p.id } });
  }

  cancelPurchase(p: PurchaseResponse): void {
    if (!confirm(`Cancel Purchase Invoice ${p.invoiceNo}? Stock and ledger will be reversed.`)) return;
    this.purchaseService.cancel(p.id).subscribe({
      next: () => { this.toast.success('Purchase cancelled.'); this.load(); this.closeView(); }
    });
  }
}
