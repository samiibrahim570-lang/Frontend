import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LedgerService } from '../../core/services/ledger.service';
import { CustomerService, SupplierService } from '../../core/services/master.service';
import { Customer, Supplier } from '../../core/models/master.model';
import { LedgerReport, PartyBalanceSummary } from '../../core/models/transactions.model';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ledger.component.html'
})
export class LedgerComponent implements OnInit {
  private ledgerService = inject(LedgerService);
  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  partyType: 'Customer' | 'Supplier' = 'Customer';
  customers = signal<Customer[]>([]);
  suppliers = signal<Supplier[]>([]);
  customerBalances = signal<PartyBalanceSummary[]>([]);
  supplierBalances = signal<PartyBalanceSummary[]>([]);

  selectedPartyId: number | null = null;
  fromDate: string | null = null;
  toDate: string | null = null;

  report = signal<LedgerReport | null>(null);
  loading = signal(false);

  ngOnInit(): void {
    this.customerService.getAll().subscribe((d) => this.customers.set(d));
    this.supplierService.getAll().subscribe((d) => this.suppliers.set(d));
    this.loadBalances();
  }

  loadBalances(): void {
    this.ledgerService.getCustomerBalances().subscribe((d) => this.customerBalances.set(d));
    this.ledgerService.getSupplierBalances().subscribe((d) => this.supplierBalances.set(d));
  }

  switchType(type: 'Customer' | 'Supplier'): void {
    this.partyType = type;
    this.selectedPartyId = null;
    this.report.set(null);
  }

  view(): void {
    if (!this.selectedPartyId) return;
    this.loading.set(true);
    const obs =
      this.partyType === 'Customer'
        ? this.ledgerService.getCustomerLedger(this.selectedPartyId, this.fromDate, this.toDate)
        : this.ledgerService.getSupplierLedger(this.selectedPartyId, this.fromDate, this.toDate);

    obs.subscribe({
      next: (data) => { this.report.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  print(): void {
    if (!this.selectedPartyId) return;
    const type = this.partyType === 'Customer' ? 'customer' : 'supplier';
    const queryParams: any = {};
    if (this.fromDate) queryParams.from = this.fromDate;
    if (this.toDate) queryParams.to = this.toDate;
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/print/ledger', type, this.selectedPartyId], { queryParams })
    );
    window.open(url, '_blank');
  }

  exportExcel(): void {
    const r = this.report();
    if (!r) return;
    this.exportService.exportToExcel(
      r.entries.map((e) => ({
        Date: e.transactionDate, Type: e.sourceType, 'Ref No': e.refNo,
        Narration: e.narration, Debit: e.debit, Credit: e.credit, Balance: e.runningBalance
      })),
      `Ledger-${r.partyName}-${this.exportService.todayStamp()}`, 'Ledger'
    );
  }
}
