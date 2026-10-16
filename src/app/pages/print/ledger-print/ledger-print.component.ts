import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LedgerService } from '../../../core/services/ledger.service';
import { LedgerReport } from '../../../core/models/transactions.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrintLetterheadComponent } from '../../../shared/components/print-letterhead/print-letterhead.component';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'app-ledger-print',
  standalone: true,
  imports: [CommonModule, IconComponent, PrintLetterheadComponent],
  templateUrl: './ledger-print.component.html'
})
export class LedgerPrintComponent implements OnInit {
  private tenant = inject(TenantService);
  private route = inject(ActivatedRoute);
  private ledgerService = inject(LedgerService);

  report = signal<LedgerReport | null>(null);
  loading = signal(true);
  partyType = signal<'customer' | 'supplier'>('customer');
  fromDate: string | null = null;
  toDate: string | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const type = (this.route.snapshot.paramMap.get('type') || 'customer') as 'customer' | 'supplier';
    this.partyType.set(type);
    this.fromDate = this.route.snapshot.queryParamMap.get('from');
    this.toDate = this.route.snapshot.queryParamMap.get('to');

    const obs = type === 'customer'
      ? this.ledgerService.getCustomerLedger(id, this.fromDate, this.toDate)
      : this.ledgerService.getSupplierLedger(id, this.fromDate, this.toDate);

    obs.subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
        this.tenant.letterhead().subscribe(() => setTimeout(() => window.print(), 500));
      },
      error: () => this.loading.set(false)
    });
  }

  print(): void { window.print(); }
  close(): void { window.close(); }

  today(): string {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
