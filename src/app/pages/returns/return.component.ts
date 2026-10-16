import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReturnService } from '../../core/services/return.service';
import { SaleService } from '../../core/services/sale.service';
import { PurchaseService } from '../../core/services/purchase.service';
import { CustomerService, SupplierService } from '../../core/services/master.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';
import { Observable } from 'rxjs';
import { defaultPagedRequest, PagedRequest, PagedResult } from '../../core/models/common.model';
import { RETURN_CONFIG, ReturnConfig, ReturnDoc, ReturnableInvoice, ReturnKind } from '../../core/models/return.model';

interface PartyOption { id: number; name: string; code: string; }
interface InvoiceOption { id: number; invoiceNo: string; invoiceDate: string; netAmount: number; status: string; }

/** Sale Return and Purchase Return screen (route data `kind` picks which). */
@Component({
  selector: 'app-return',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './return.component.html'
})
export class ReturnComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private returnService = inject(ReturnService);
  private saleService = inject(SaleService);
  private purchaseService = inject(PurchaseService);
  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);
  private toast = inject(ToastService);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  cfg!: ReturnConfig;
  kind!: ReturnKind;

  // list
  docs = signal<ReturnDoc[]>([]);
  totalCount = signal(0);
  loading = signal(true);
  request: PagedRequest = { ...defaultPagedRequest };
  viewing = signal<ReturnDoc | null>(null);

  // form
  showForm = signal(false);
  saving = signal(false);
  parties = signal<PartyOption[]>([]);
  invoices = signal<InvoiceOption[]>([]);
  partyId: number | null = null;
  invoiceId: number | null = null;
  returnable = signal<ReturnableInvoice | null>(null);
  qty = signal<Record<number, number>>({});
  returnNo = '';
  returnDate = new Date().toISOString().substring(0, 10);
  deductionAmount = 0;
  refundAmount = 0;
  remarks = '';

  lineTotal = (detailId: number, rate: number) => Math.round((this.qty()[detailId] || 0) * rate * 100) / 100;
  totalAmount = computed(() =>
    (this.returnable()?.lines ?? []).reduce((s, l) => s + this.lineTotal(l.detailId, l.rate), 0));

  ngOnInit(): void {
    this.kind = (this.route.snapshot.data['kind'] as ReturnKind) ?? 'sale';
    this.cfg = RETURN_CONFIG[this.kind];
    const parties$ = this.kind === 'sale' ? this.customerService.getAll() : this.supplierService.getAll();
    parties$.subscribe((d: any[]) => this.parties.set(d.map((p) => ({ id: p.id, name: p.name, code: p.code }))));
    this.load();

    // "Return" button on a Sale/Purchase invoice opens this page with the invoice pre-selected
    const invoiceId = Number(this.route.snapshot.queryParamMap.get('invoiceId'));
    if (invoiceId) this.openCreate(invoiceId);
  }

  load(): void {
    this.loading.set(true);
    this.returnService.getAll(this.kind, this.request).subscribe({
      next: (res) => { this.docs.set(res.items); this.totalCount.set(res.totalCount); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  search(term: string): void {
    this.request.search = term || null;
    this.request.pageNumber = 1;
    this.load();
  }

  openCreate(invoiceId?: number): void {
    this.partyId = null;
    this.invoiceId = null;
    this.invoices.set([]);
    this.returnable.set(null);
    this.qty.set({});
    this.returnNo = '';
    this.returnDate = new Date().toISOString().substring(0, 10);
    this.deductionAmount = 0;
    this.refundAmount = 0;
    this.remarks = '';
    this.viewing.set(null);
    this.showForm.set(true);
    if (invoiceId) {
      this.invoiceId = invoiceId;
      this.loadReturnable(invoiceId, true);
    }
  }

  cancelForm(): void {
    this.showForm.set(false);
    if (this.route.snapshot.queryParamMap.has('invoiceId')) this.router.navigate([], { queryParams: {} });
  }

  onPartyChange(): void {
    this.invoiceId = null;
    this.returnable.set(null);
    this.qty.set({});
    this.invoices.set([]);
    if (!this.partyId) return;
    const req: PagedRequest = { ...defaultPagedRequest, pageSize: 200 };
    const list$: Observable<PagedResult<any>> = this.kind === 'sale'
      ? this.saleService.getAll(req, this.partyId)
      : this.purchaseService.getAll(req, this.partyId);
    list$.subscribe((res) =>
      this.invoices.set(res.items
        .filter((i: any) => i.status !== 'Cancelled')
        .map((i: any) => ({ id: i.id, invoiceNo: i.invoiceNo, invoiceDate: i.invoiceDate, netAmount: i.netAmount, status: i.status }))));
  }

  onInvoiceChange(): void {
    this.qty.set({});
    this.returnable.set(null);
    if (this.invoiceId) this.loadReturnable(this.invoiceId, false);
  }

  private loadReturnable(invoiceId: number, setParty: boolean): void {
    this.returnService.getReturnable(this.kind, invoiceId).subscribe({
      next: (r) => {
        this.returnable.set(r);
        if (setParty) {
          this.partyId = r.partyId;
          this.invoices.set([{ id: r.invoiceId, invoiceNo: r.invoiceNo, invoiceDate: r.invoiceDate, netAmount: r.netAmount, status: 'Confirmed' }]);
        }
        if (r.lines.every((l) => l.returnableQty <= 0)) this.toast.info('Everything on this invoice has already been returned.');
      }
    });
  }

  setQty(detailId: number, value: number | string, max: number): void {
    let n = Number(value) || 0;
    if (n < 0) n = 0;
    if (n > max) { n = max; this.toast.error(`Return quantity cannot exceed the returnable quantity (${max}).`); }
    this.qty.set({ ...this.qty(), [detailId]: n });
  }

  returnAll(): void {
    const all: Record<number, number> = {};
    for (const l of this.returnable()?.lines ?? []) all[l.detailId] = l.returnableQty;
    this.qty.set(all);
  }

  netAmount(): number { return this.totalAmount() - (this.deductionAmount || 0); }
  balanceAmount(): number { return this.netAmount() - (this.refundAmount || 0); }

  save(): void {
    const r = this.returnable();
    if (!r) { this.toast.error(`Select the original ${this.cfg.invoiceLabel.toLowerCase()}.`); return; }
    const items = r.lines
      .filter((l) => (this.qty()[l.detailId] || 0) > 0)
      .map((l) => ({ detailId: l.detailId, quantity: this.qty()[l.detailId] }));
    if (items.length === 0) { this.toast.error('Enter a return quantity for at least one item.'); return; }
    for (const l of r.lines) {
      if ((this.qty()[l.detailId] || 0) > l.returnableQty) {
        this.toast.error(`'${l.itemName}': return qty is more than the returnable qty (${l.returnableQty}).`);
        return;
      }
    }
    if (this.deductionAmount < 0 || this.refundAmount < 0) { this.toast.error('Deduction and refund cannot be negative.'); return; }
    if (this.deductionAmount > this.totalAmount()) { this.toast.error('Deduction cannot be more than the return total.'); return; }
    if (this.refundAmount > this.netAmount()) { this.toast.error('Refund cannot be more than the net return amount.'); return; }
    if (this.returnDate < r.invoiceDate.substring(0, 10)) { this.toast.error('Return date cannot be before the invoice date.'); return; }

    this.saving.set(true);
    this.returnService.create(this.kind, {
      returnNo: this.returnNo.trim() || null,
      returnDate: this.returnDate,
      invoiceId: r.invoiceId,
      deductionAmount: this.deductionAmount || 0,
      refundAmount: this.refundAmount || 0,
      remarks: this.remarks || null,
      items
    }).subscribe({
      next: (doc) => {
        this.saving.set(false);
        this.toast.success(`${this.cfg.title} ${doc.returnNo} saved.`);
        this.cancelForm();
        this.load();
        this.viewing.set(doc);
      },
      error: () => this.saving.set(false)
    });
  }

  view(d: ReturnDoc): void { this.viewing.set(d); this.showForm.set(false); }
  closeView(): void { this.viewing.set(null); }

  print(d: ReturnDoc): void {
    const url = this.router.serializeUrl(this.router.createUrlTree([`/print/${this.kind}-return`, d.id]));
    window.open(url, '_blank');
  }

  cancelReturn(d: ReturnDoc): void {
    if (!confirm(`Cancel ${this.cfg.title} ${d.returnNo}? Stock and ledger will be reversed.`)) return;
    this.returnService.cancel(this.kind, d.id).subscribe(() => {
      this.toast.success(`${this.cfg.title} cancelled.`);
      this.closeView();
      this.load();
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.docs().map((d) => ({
        'Return No': d.returnNo, Date: d.returnDate, [this.cfg.partyLabel]: d.partyName, 'Invoice No': d.invoiceNo,
        Total: d.totalAmount, Deduction: d.deductionAmount, 'Net Return': d.netAmount, Refund: d.refundAmount,
        'Balance Adj.': d.balanceAmount, Status: d.status
      })),
      `${this.cfg.title.replace(' ', '-')}-${this.exportService.todayStamp()}`, this.cfg.title
    );
  }
}
