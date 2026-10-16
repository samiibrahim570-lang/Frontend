import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GatePassService } from '../../../core/services/gate-pass.service';
import { GatePassResponse } from '../../../core/models/transactions.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrintLetterheadComponent } from '../../../shared/components/print-letterhead/print-letterhead.component';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'app-gate-pass-print',
  standalone: true,
  imports: [CommonModule, IconComponent, PrintLetterheadComponent],
  templateUrl: './gate-pass-print.component.html'
})
export class GatePassPrintComponent implements OnInit {
  private tenant = inject(TenantService);
  private route = inject(ActivatedRoute);
  private gatePassService = inject(GatePassService);

  gatePass = signal<GatePassResponse | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.gatePassService.getById(id).subscribe({
      next: (data) => {
        this.gatePass.set(data);
        this.loading.set(false);
        this.tenant.letterhead().subscribe(() => setTimeout(() => window.print(), 500));
      },
      error: () => this.loading.set(false)
    });
  }

  print(): void { window.print(); }
  close(): void { window.close(); }
}
