import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SaleService } from '../../../core/services/sale.service';
import { SaleResponse } from '../../../core/models/sale-purchase.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-sale-invoice-print',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './sale-invoice-print.component.html'
})
export class SaleInvoicePrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private saleService = inject(SaleService);

  invoice = signal<SaleResponse | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.saleService.getById(id).subscribe({
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
