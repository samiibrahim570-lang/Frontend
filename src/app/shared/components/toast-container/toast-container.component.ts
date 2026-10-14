import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrap">
      @for (t of toastService.toasts(); track t.id) {
        <div class="toast" [class]="t.type" (click)="toastService.dismiss(t.id)">
          {{ t.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrap {
      position: fixed;
      top: 76px; /* below the app header so the bell / theme buttons stay clickable */
      right: 16px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: min(340px, calc(100vw - 32px));
    }
    .toast {
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      color: #fff;
      font-size: 14px;
      box-shadow: var(--shadow-md);
      font-weight: 500;
      cursor: pointer;
      animation: slideIn 0.2s ease-out;
    }
    .toast.success { background: var(--color-success); }
    .toast.error { background: var(--color-danger); }
    .toast.info { background: var(--color-primary); }
    .toast.warning { background: var(--color-warning-solid); }
    @keyframes slideIn {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
