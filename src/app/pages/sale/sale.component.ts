import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SaleService } from '../../core/services/sale.service';
import { CustomerService, BookerService, ItemService } from '../../core/services/master.service';
import { Customer, Booker, Item } from '../../core/models/master.model';
import { SaleResponse } from '../../core/models/sale-purchase.model';
import { defaultPagedRequest, PagedRequest } from '../../core/models/common.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-sale',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sale.component.html'
})
export class SaleComponent implements OnInit {
  private saleService = inject(SaleService);
  private customerService = inject(CustomerService);
  private bookerService = inject(BookerService);
  private itemService = inject(ItemService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  sales = signal<SaleResponse[]>([]);
  totalCount = signal(0);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  viewing = signal<SaleResponse | null>(null);

  customers = signal<Customer[]>([]);
  bookers = signal<Booker[]>([]);
  items = signal<Item[]>([]);

  request: PagedRequest = { ...defaultPagedRequest };

  form = this.fb.group({
    invoiceNo: [''],
    invoiceDate: [this.today(), Validators.required],
    customerId: [null as number | null, Validators.required],
    bookerId: [null as number | null],
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
    this.customerService.getAll().subscribe((d) => this.customers.set(d));
    this.bookerService.getAll().subscribe((d) => this.bookers.set(d));
    this.itemService.getAll().subscribe((d) => this.items.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.saleService.getAll(this.request).subscribe({
      next: (res) => {
        this.sales.set(res.items);
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
      customerId: null,
      bookerId: null,
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
      this.toast.error('Please fill customer and at least one item line.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.saleService
      .create({
        invoiceNo: v.invoiceNo || null,
        invoiceDate: v.invoiceDate!,
        customerId: v.customerId!,
        bookerId: v.bookerId,
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
          this.toast.success(`Sale invoice ${res.invoiceNo} created.`);
          this.showForm.set(false);
          this.load();
        },
        error: () => this.saving.set(false)
      });
  }

  view(s: SaleResponse): void {
    this.viewing.set(s);
    this.showForm.set(false);
  }

  closeView(): void {
    this.viewing.set(null);
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.sales().map((s) => ({
        'Invoice No': s.invoiceNo, Date: s.invoiceDate, Customer: s.customerName, Booker: s.bookerName,
        Driver: s.driverName, Vehicle: s.vehicleNumber, 'Net Amount': s.netAmount,
        Paid: s.paidAmount, Balance: s.balanceAmount, Status: s.status
      })),
      `Sale-List-${this.exportService.todayStamp()}`, 'Sales'
    );
  }

  printInvoice(s: SaleResponse): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/print/sale', s.id]));
    window.open(url, '_blank');
  }

  // Opens a new Gate Pass with this invoice pre-selected
  createGatePass(s: SaleResponse): void {
    this.router.navigate(['/gate-pass'], { queryParams: { type: 'Sale', invoiceId: s.id } });
  }

  cancelSale(s: SaleResponse): void {
    if (!confirm(`Cancel Sale Invoice ${s.invoiceNo}? Stock and ledger will be reversed.`)) return;
    this.saleService.cancel(s.id).subscribe({
      next: () => { this.toast.success('Sale cancelled.'); this.load(); this.closeView(); }
    });
  }
}
