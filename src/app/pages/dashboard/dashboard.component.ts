import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { DashboardSummary } from '../../core/models/transactions.model';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StockAlertService } from '../../core/services/stock-alert.service';
import { StockAlertsCardComponent } from '../../shared/components/stock-alerts-card/stock-alerts-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, StockAlertsCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private reportService = inject(ReportService);
  auth = inject(AuthService);
  stock = inject(StockAlertService);

  summary = signal<DashboardSummary | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.reportService.getDashboard().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /** Live count once alerts are loaded, otherwise the server summary value. */
  lowStockCount(s: DashboardSummary): number {
    return this.stock.loaded() ? this.stock.count() : s.lowStockItemsCount;
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  todayDate(): string {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
