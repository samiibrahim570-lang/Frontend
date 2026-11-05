import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TenantService } from '../../core/services/tenant.service';
import { AccessibleCompany } from '../../core/models/tenant.model';
import { BRAND } from '../../core/config/brand.config';

const SEARCHABLE_COMPANY_COUNT = 6;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  tenant = inject(TenantService);

  readonly brand = BRAND;
  readonly year = new Date().getFullYear();

  step = signal<'credentials' | 'workspace'>('credentials');
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  // Workspace step
  companyId = signal<number | null>(null);
  branchId = signal<number | null>(null);
  companySearch = signal('');
  private welcomeName = '';

  showCompanySearch = computed(() => this.tenant.companies().length > SEARCHABLE_COMPANY_COUNT);
  visibleCompanies = computed(() => {
    const term = this.companySearch().trim().toLowerCase();
    return this.tenant.companies().filter((c) => !term || c.name.toLowerCase().includes(term));
  });
  selectedCompany = computed(() => this.tenant.companies().find((c) => c.id === this.companyId()) ?? null);

  form = this.fb.group({
    userName: ['', Validators.required],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.loading()) return;
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.tenant.clear(); // never carry the previous user's company into this session
    this.authService.login(this.form.getRawValue() as any).subscribe({
      next: (res) => {
        this.welcomeName = res.data.fullName;
        this.tenant.loadContext().subscribe((ctx) => {
          const branchCount = (ctx?.companies ?? []).reduce((sum, c) => sum + c.branches.length, 0);
          if (ctx && branchCount > 1) {
            this.companyId.set(ctx.currentCompanyId);
            this.branchId.set(ctx.currentBranchId);
            this.step.set('workspace');
            this.loading.set(false);
          } else {
            this.enterApp();
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.describeError(err));
      }
    });
  }

  chooseCompany(company: AccessibleCompany): void {
    this.companyId.set(company.id);
    const branch = company.branches.find((b) => b.isDefault) ?? company.branches[0];
    this.branchId.set(branch?.id ?? null);
  }

  logoUrl(company: AccessibleCompany): string | null {
    return this.tenant.logoUrl(company.logoPath);
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  continueToWorkspace(): void {
    const companyId = this.companyId();
    const branchId = this.branchId();
    if (this.loading() || !companyId || !branchId) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.tenant.select(companyId, branchId).subscribe({
      next: () => this.enterApp(),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.describeError(err));
      }
    });
  }

  useDifferentAccount(): void {
    this.authService.logout();
    this.tenant.clear();
    this.form.reset();
    this.errorMessage.set(null);
    this.step.set('credentials');
  }

  private enterApp(): void {
    this.loading.set(false);
    this.toast.success(`Welcome back, ${this.welcomeName}`);
    this.router.navigate(['/dashboard']);
  }

  private describeError(err: HttpErrorResponse): string {
    if (err.status === 0) return "Can't reach the server. Check your internet connection and try again.";
    return err.error?.message || 'Something went wrong. Please try again.';
  }
}
