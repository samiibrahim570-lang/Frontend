import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PurchaseService } from '../../../core/services/purchase.service';
import { PurchaseResponse } from '../../../core/models/sale-purchase.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-purchase-invoice-print',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './purchase-invoice-print.component.html'
})
export class PurchaseInvoicePrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private purchaseService = inject(PurchaseService);

  invoice = signal<PurchaseResponse | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.purchaseService.getById(id).subscribe({
      next: (data) => {
        this.invoice.set(data);
        this.loading.set(false);
        setTimeout(() => window.print(), 400);
      },
      error: () => this.loading.set(false)
    });
  }

  print(): void {
    window.print();
  }

  close(): void {
    window.close();
  }
}
