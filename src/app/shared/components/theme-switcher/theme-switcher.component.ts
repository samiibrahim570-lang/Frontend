import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { ThemePreference, ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../icon/icon.component';

/** Header theme picker. Selection is applied app-wide and saved per user by ThemeService. */
@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="theme-btn"
      [class.active]="open()"
      (click)="open.set(!open())"
      [attr.aria-expanded]="open()"
      aria-haspopup="menu"
      aria-label="Change theme"
      title="Theme"
    >
      <app-icon name="palette" [size]="20"></app-icon>
    </button>

    @if (open()) {
      <div class="dropdown-panel theme-panel" role="menu" aria-label="Theme">
        <div class="dropdown-head">
          <div>
            <div class="dropdown-title">Appearance</div>
            <div class="text-xs text-muted">Saved to your profile on this device</div>
          </div>
        </div>
        <div class="theme-list">
          @for (t of theme.options; track t.id) {
            <button
              type="button"
              role="menuitemradio"
              class="theme-option"
              [class.selected]="theme.preference() === t.id"
              [attr.aria-checked]="theme.preference() === t.id"
              (click)="select(t.id)"
            >
              <span class="swatch" [class.system]="t.id === 'system'">
                <span [style.background]="t.swatch[0]"></span>
                <span [style.background]="t.swatch[1]"></span>
                <span [style.background]="t.swatch[2]"></span>
              </span>
              <span class="theme-text">
                <span class="theme-label">{{ t.label }}</span>
                <span class="text-xs text-muted">{{ t.description }}</span>
              </span>
              @if (theme.preference() === t.id) {
                <app-icon class="theme-check" name="check" [size]="16"></app-icon>
              }
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: relative; display: block; }
    .theme-btn {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: none;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .theme-btn:hover, .theme-btn.active { background: var(--color-hover); color: var(--color-primary); }
    .theme-btn.active { border-color: var(--color-border); }
    .theme-btn:focus-visible { outline: none; box-shadow: var(--focus-ring); }

    .theme-panel { width: 280px; }
    .theme-list { padding: 6px; display: grid; gap: 2px; }
    .theme-option {
      display: flex; align-items: center; gap: 12px;
      width: 100%;
      padding: 9px 10px;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.12s ease, border-color 0.12s ease;
    }
    .theme-option:hover { background: var(--color-hover); }
    .theme-option:focus-visible { outline: none; box-shadow: var(--focus-ring); }
    .theme-option.selected { border-color: rgba(var(--color-primary-rgb), 0.35); background: rgba(var(--color-primary-rgb), 0.07); }
    .swatch {
      width: 34px; height: 34px; flex-shrink: 0;
      border-radius: 50%;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      border: 1px solid var(--color-border-strong);
      transform: rotate(-45deg);
    }
    .swatch span:first-child { grid-column: 1 / 3; }
    .swatch.system span:first-child { grid-column: 1 / 2; grid-row: 1 / 3; }
    .swatch.system span:nth-child(2) { display: none; }
    .swatch.system span:last-child { grid-row: 1 / 3; }
    .theme-text { display: grid; flex: 1; min-width: 0; line-height: 1.3; }
    .theme-label { font-weight: 600; font-size: 13.5px; }
    .theme-check { color: var(--color-primary); display: flex; }

    @media (max-width: 640px) {
      .theme-panel { position: fixed; top: 68px; left: 12px; right: 12px; width: auto; }
    }
  `]
})
export class ThemeSwitcherComponent {
  theme = inject(ThemeService);
  private host = inject(ElementRef<HTMLElement>);

  open = signal(false);

  select(pref: ThemePreference): void {
    this.theme.setTheme(pref);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
