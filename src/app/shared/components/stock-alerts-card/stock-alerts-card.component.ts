import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StockAlertService } from '../../../core/services/stock-alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../icon/icon.component';

/** Dashboard card listing the latest low-stock alerts, highlighting items that need restocking. */
@Component({
  selector: 'app-stock-alerts-card',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './stock-alerts-card.component.html',
  styleUrl: './stock-alerts-card.component.scss'
})
export class StockAlertsCardComponent {
  stock = inject(StockAlertService);
  auth = inject(AuthService);

  /** Number of latest alerts to list; the notification bell shows the rest. */
  @Input() maxAlerts = 6;
}
