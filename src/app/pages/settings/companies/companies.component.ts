import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CompanyAdminService } from '../../../core/services/company-admin.service';
import { TenantService } from '../../../core/services/tenant.service';
import { ToastService } from '../../../core/services/toast.service';
import { Company } from '../../../core/models/tenant.model';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './companies.component.html'
})
export class CompaniesComponent implements OnInit {
  private service = inject(CompanyAdminService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private router = inject(Router);
  tenant = inject(TenantService);

  companies = signal<Company[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingId = signal<number | null>(null);
  logoPreview = signal<string | null>(null);
  private logoFile: File | null = null;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    tagline: ['', Validators.maxLength(300)],
    address: ['', Validators.maxLength(500)],
    phone: ['', Validators.maxLength(50)],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    ntnNo: ['', Validators.maxLength(50)],
    strnNo: ['', Validators.maxLength(50)],
    website: ['', Validators.maxLength(150)],
    isActive: [true],
    defaultBranchName: ['Main', Validators.maxLength(150)]
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (d) => { this.companies.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ isActive: true, defaultBranchName: 'Main' });
    this.logoFile = null;
    this.logoPreview.set(null);
    this.showForm.set(true);
  }

  openEdit(c: Company): void {
    this.editingId.set(c.id);
    this.form.reset({ ...c, defaultBranchName: null } as any);
    this.logoFile = null;
    this.logoPreview.set(this.tenant.logoUrl(c.logoPath));
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  onLogoSelected(input: HTMLInputElement): void {
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) { this.toast.error('Logo must be a PNG, JPG, WEBP or GIF image.'); input.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { this.toast.error('Logo must be 2 MB or smaller.'); input.value = ''; return; }
    this.logoFile = file;
    this.logoPreview.set(URL.createObjectURL(file));
  }

  removeLogo(): void {
    const id = this.editingId();
    this.logoFile = null;
    this.logoPreview.set(null);
    if (id) this.service.removeLogo(id).subscribe(() => { this.toast.success('Logo removed.'); this.load(); this.refreshHeader(); });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const id = this.editingId();
    this.saving.set(true);

    const done = (companyId: number, message: string) => {
      const finish = () => {
        this.saving.set(false);
        this.toast.success(message);
        this.cancel();
        this.load();
        this.refreshHeader();
      };
      if (this.logoFile) {
        this.service.uploadLogo(companyId, this.logoFile).subscribe({ next: finish, error: () => { this.saving.set(false); this.load(); } });
      } else {
        finish();
      }
    };

    const req: Observable<any> = id
      ? this.service.update(id, v as any)
      : this.service.create(v as any);
    req.subscribe({
      next: (res: any) => done(id ?? res.id, id ? 'Company updated.' : 'Company created with a default "' + (v.defaultBranchName || 'Main') + '" branch.'),
      error: () => this.saving.set(false)
    });
  }

  toggle(c: Company): void {
    const action = c.isActive ? 'Disable' : 'Enable';
    if (!confirm(`${action} company "${c.name}"?${c.isActive ? ' Its users will no longer be able to switch to it.' : ''}`)) return;
    this.service.toggleActive(c.id).subscribe((r) => {
      this.toast.success(r.isActive ? 'Company enabled.' : 'Company disabled.');
      this.load();
      this.refreshHeader();
    });
  }

  manageBranches(c: Company): void {
    this.router.navigate(['/settings/branches'], { queryParams: { companyId: c.id } });
  }

  private refreshHeader(): void {
    this.tenant.loadContext().subscribe();
  }
}
