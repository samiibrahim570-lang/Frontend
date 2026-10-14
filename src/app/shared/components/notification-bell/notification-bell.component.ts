import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StockAlertService } from '../../../core/services/stock-alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../icon/icon.component';

/** Header bell: live low-stock alerts for the whole app (data from StockAlertService). */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent {
  stock = inject(StockAlertService);
  auth = inject(AuthService);
  private host = inject(ElementRef<HTMLElement>);

  open = signal(false);

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.open.set(true);
      this.stock.refresh();
    }
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    // Everything the user has now seen is no longer "new"
    this.stock.markAllRead();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  get viewAllLink(): string | null {
    if (this.auth.canView('ITEM')) return '/masters/item';
    if (this.auth.canView('REPORTS')) return '/reports';
    return null;
  }
}
