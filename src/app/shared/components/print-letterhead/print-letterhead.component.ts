import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { TenantService } from '../../../core/services/tenant.service';
import { Letterhead } from '../../../core/models/tenant.model';

/**
 * Company logo + name + contact/tax info + selected branch, at the top of every printed document and report.
 * Everything comes from the Companies/Branches tables (GET /api/Session/letterhead), nothing is hardcoded.
 * Usage: <app-print-letterhead subtitle="Gate Pass Slip"></app-print-letterhead>
 */
@Component({
  selector: 'app-print-letterhead',
  standalone: true,
  host: { class: 'print-company' },
  template: `
    @if (logo()) {
      <img class="logo" [src]="logo()" [alt]="lh()?.companyName" />
    } @else {
      <div class="mark">{{ initials() }}</div>
    }
    <div>
      <h2>{{ lh()?.companyName || 'Loading…' }}</h2>
      @if (subtitle) { <p>{{ subtitle }}</p> }
      @else if (lh()?.tagline) { <p>{{ lh()!.tagline }}</p> }
      @if (contactLine()) { <p>{{ contactLine() }}</p> }
      @if (taxLine()) { <p>{{ taxLine() }}</p> }
      @if (lh(); as l) {
        <p class="branch-line"><strong>Branch:</strong> {{ l.branchName }}@if (l.branchAddress) { — {{ l.branchAddress }} }@if (l.branchPhone) { · {{ l.branchPhone }} }</p>
      }
    </div>
  `,
  styles: [`
    .logo { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
    .branch-line { color: var(--color-text) !important; }
  `]
})
export class PrintLetterheadComponent implements OnInit {
  @Input() subtitle: string | null = null;

  private tenant = inject(TenantService);
  lh = signal<Letterhead | null>(null);
  logo = signal<string | null>(null);

  ngOnInit(): void {
    this.tenant.letterhead().subscribe((l) => {
      this.lh.set(l);
      this.logo.set(this.tenant.logoUrl(l?.logoPath));
    });
  }

  initials(): string {
    const name = this.lh()?.companyName ?? '';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—';
  }

  contactLine(): string {
    const l = this.lh();
    if (!l) return '';
    return [l.address, l.phone ? `Phone: ${l.phone}` : null, l.email, l.website].filter(Boolean).join('  |  ');
  }

  taxLine(): string {
    const l = this.lh();
    if (!l) return '';
    return [l.ntnNo ? `NTN: ${l.ntnNo}` : null, l.strnNo ? `STRN: ${l.strnNo}` : null].filter(Boolean).join('  |  ');
  }
}
