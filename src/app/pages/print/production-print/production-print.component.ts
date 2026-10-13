import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductionService } from '../../../core/services/production.service';
import { ProductionResponse } from '../../../core/models/transactions.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-production-print',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './production-print.component.html'
})
export class ProductionPrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productionService = inject(ProductionService);

  record = signal<ProductionResponse | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productionService.getById(id).subscribe({
      next: (data) => {
        this.record.set(data);
        this.loading.set(false);
        setTimeout(() => window.print(), 400);
      },
      error: () => this.loading.set(false)
    });
  }

  print(): void { window.print(); }
  close(): void { window.close(); }
}
