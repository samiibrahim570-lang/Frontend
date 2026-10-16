import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/common.model';
import { VoucherResponse } from '../../../core/models/transactions.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrintLetterheadComponent } from '../../../shared/components/print-letterhead/print-letterhead.component';
import { TenantService } from '../../../core/services/tenant.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-voucher-print',
  standalone: true,
  imports: [CommonModule, IconComponent, PrintLetterheadComponent],
  templateUrl: './voucher-print.component.html'
})
export class VoucherPrintComponent implements OnInit {
  private tenant = inject(TenantService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  voucher = signal<VoucherResponse | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    // Vouchers has no GetById endpoint on the backend; fetch a large page and find the record.
    // (Kept intentionally simple - if you add GET /api/Vouchers/{id} to the backend later, swap this out.)
    this.http
      .get<ApiResponse<{ items: VoucherResponse[] }>>(`${environment.apiUrl}/Vouchers`, {
        params: { pageNumber: 1, pageSize: 5000 } as any
      })
      .pipe(map((r) => r.data.items.find((v) => v.id === id) || null))
      .subscribe({
        next: (data) => {
          this.voucher.set(data);
          this.loading.set(false);
          this.tenant.letterhead().subscribe(() => setTimeout(() => window.print(), 500));
        },
        error: () => this.loading.set(false)
      });
  }

  print(): void { window.print(); }
  close(): void { window.close(); }
}
