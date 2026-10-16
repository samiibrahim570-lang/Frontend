import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReturnService } from '../../../core/services/return.service';
import { RETURN_CONFIG, ReturnConfig, ReturnDoc, ReturnKind } from '../../../core/models/return.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrintLetterheadComponent } from '../../../shared/components/print-letterhead/print-letterhead.component';
import { TenantService } from '../../../core/services/tenant.service';

/** Printable Sale Return / Purchase Return note (route data `kind`). */
@Component({
  selector: 'app-return-print',
  standalone: true,
  imports: [CommonModule, IconComponent, PrintLetterheadComponent],
  templateUrl: './return-print.component.html'
})
export class ReturnPrintComponent implements OnInit {
  private tenant = inject(TenantService);
  private route = inject(ActivatedRoute);
  private returnService = inject(ReturnService);

  cfg!: ReturnConfig;
  doc = signal<ReturnDoc | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const kind = (this.route.snapshot.data['kind'] as ReturnKind) ?? 'sale';
    this.cfg = RETURN_CONFIG[kind];
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.returnService.getById(kind, id).subscribe({
      next: (d) => {
        this.doc.set(d);
        this.loading.set(false);
        this.tenant.letterhead().subscribe(() => setTimeout(() => window.print(), 500));
      },
      error: () => this.loading.set(false)
    });
  }

  print(): void { window.print(); }
  close(): void { window.close(); }
}
