import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GatePassService } from '../../core/services/gate-pass.service';
import { BookerService } from '../../core/services/master.service';
import { Booker } from '../../core/models/master.model';
import { GatePassPickableInvoice, GatePassResponse } from '../../core/models/transactions.model';
import { defaultPagedRequest, PagedRequest } from '../../core/models/common.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';
import { toIsoDate, DateRange } from '../../core/utils/date.util';
import { DateRangeFilterComponent } from '../../shared/components/date-range-filter/date-range-filter.component';
import { PagerComponent } from '../../shared/components/pager/pager.component';

type GatePassType = 'Sale' | 'Purchase';

@Component({
  selector: 'app-gate-pass',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateRangeFilterComponent, PagerComponent],
  templateUrl: './gate-pass.component.html'
})
export class GatePassComponent implements OnInit {
  private gatePassService = inject(GatePassService);
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

  /** Every invoice the user has selected; only these are sent to the server. */
  selected = signal<GatePassPickableInvoice[]>([]);
  selectedIds = computed(() => new Set(this.selected().map((i) => i.id)));
  selectedQuantity = computed(() => this.selected().reduce((sum, i) => sum + i.totalQuantity, 0));
  selectedAmount = computed(() => this.selected().reduce((sum, i) => sum + i.netAmount, 0));
  blockedInvoices = computed(() => this.selected().filter((i) => !!i.onGatePassNo));

  /** The browse list stays closed until the user asks to add more invoices. */
  browsing = signal(false);
  browseLoading = signal(false);
  browseResults = signal<GatePassPickableInvoice[]>([]);
  private browseFilter: DateRange & { search: string | null } = { from: null, to: null, search: null };

  request: PagedRequest = { ...defaultPagedRequest };

  form = this.fb.group({
    gatePassNo: [''],
    gatePassDate: [toIsoDate(new Date()), Validators.required],
    gatePassType: ['Sale', Validators.required],
    bookerId: [null as number | null],
    driverName: [''],
    vehicleNumber: [''],
    remarks: ['']
  });

  get currentType(): GatePassType {
    return this.form.value.gatePassType === 'Purchase' ? 'Purchase' : 'Sale';
  }

  ngOnInit(): void {
    this.bookerService.getAll().subscribe((d) => this.bookers.set(d));
    this.load();

    this.form.get('gatePassType')?.valueChanges.subscribe(() => {
      this.selected.set([]);
      this.browseResults.set([]);
      this.openBrowse();
    });

    // Opened from Sale/Purchase with the invoices the user selected there: ?type=Sale&invoiceIds=12,15
    const params = this.route.snapshot.queryParamMap;
    const ids = (params.get('invoiceIds') ?? params.get('invoiceId') ?? '')
      .split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0);
    const type: GatePassType = params.get('type') === 'Purchase' ? 'Purchase' : 'Sale';
    if (ids.length > 0 && this.auth.canCreate('GATEPASS')) {
      this.openCreate(type, ids);
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

  onListRange(range: DateRange): void {
    this.request.fromDate = range.from;
    this.request.toDate = range.to;
    this.request.pageNumber = 1;
    this.load();
  }

  search(term: string): void {
    this.request.search = term || null;
    this.request.pageNumber = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.request.pageNumber = page;
    this.load();
  }

  openCreate(type: GatePassType = 'Sale', preselectedIds: number[] = []): void {
    // emitEvent: false so the type-change handler doesn't wipe the pre-selected invoices
    this.form.reset({
      gatePassNo: '',
      gatePassDate: toIsoDate(new Date()),
      gatePassType: type,
      bookerId: null,
      driverName: '',
      vehicleNumber: '',
      remarks: ''
    }, { emitEvent: false });
    this.selected.set([]);
    this.browseResults.set([]);
    this.browseFilter = { from: null, to: null, search: null };
    this.showForm.set(true);
    this.viewing.set(null);

    if (preselectedIds.length > 0) {
      // Only the invoices the user chose are shown; more can be added on request
      this.browsing.set(false);
      this.gatePassService.getPickableInvoices(type, { ids: preselectedIds }).subscribe((rows) => {
        this.selected.set(rows);
        this.prefillTripDetails(rows);
      });
    } else {
      this.openBrowse();
    }
  }

  /** Fills trip fields only when every selected invoice agrees, so a guess never reaches the slip. */
  private prefillTripDetails(rows: GatePassPickableInvoice[]): void {
    const shared = <T>(values: T[]): T | null => {
      const distinct = new Set(values);
      return distinct.size === 1 ? values[0] : null;
    };
    this.form.patchValue({
      driverName: shared(rows.map((r) => r.driverName ?? '')) ?? '',
      vehicleNumber: shared(rows.map((r) => r.vehicleNumber ?? '')) ?? '',
      bookerId: shared(rows.map((r) => r.bookerId ?? null))
    }, { emitEvent: false });
  }

  openBrowse(): void {
    this.browsing.set(true);
    this.loadBrowse();
  }

  closeBrowse(): void {
    this.browsing.set(false);
  }

  onBrowseRange(range: DateRange): void {
    this.browseFilter = { ...this.browseFilter, ...range };
    this.loadBrowse();
  }

  onBrowseSearch(term: string): void {
    this.browseFilter = { ...this.browseFilter, search: term || null };
    this.loadBrowse();
  }

  private loadBrowse(): void {
    this.browseLoading.set(true);
    this.gatePassService.getPickableInvoices(this.currentType, this.browseFilter).subscribe({
      next: (rows) => { this.browseResults.set(rows); this.browseLoading.set(false); },
      error: () => this.browseLoading.set(false)
    });
  }

  toggleInvoice(invoice: GatePassPickableInvoice): void {
    this.selected.update((cur) =>
      cur.some((i) => i.id === invoice.id) ? cur.filter((i) => i.id !== invoice.id) : [...cur, invoice]);
  }

  removeInvoice(id: number): void {
    this.selected.update((cur) => cur.filter((i) => i.id !== id));
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
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
    if (this.selected().length === 0) {
      this.toast.error('Select at least one invoice to include in the Gate Pass.');
      return;
    }
    if (this.blockedInvoices().length > 0) {
      this.toast.error('Remove invoices that are already on another Gate Pass.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.gatePassService
      .create({
        gatePassNo: v.gatePassNo || null,
        gatePassDate: v.gatePassDate!,
        gatePassType: v.gatePassType as GatePassType,
        bookerId: v.bookerId,
        driverName: v.driverName,
        vehicleNumber: v.vehicleNumber,
        remarks: v.remarks,
        confirm,
        invoiceIds: this.selected().map((i) => i.id)
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success(`Gate Pass ${res.gatePassNo} ${confirm ? 'created and confirmed' : 'saved as Draft'} with ${res.totalInvoices} invoice(s).`);
          this.showForm.set(false);
          this.load();
          this.viewing.set(res);
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
