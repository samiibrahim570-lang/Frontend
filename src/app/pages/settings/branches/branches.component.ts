import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { BranchAdminService } from '../../../core/services/company-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { ToastService } from '../../../core/services/toast.service';
import { Branch, Company } from '../../../core/models/tenant.model';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branches.component.html'
})
export class BranchesComponent implements OnInit {
  private service = inject(BranchAdminService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private tenant = inject(TenantService);
  auth = inject(AuthService);

  companies = signal<Pick<Company, 'id' | 'name' | 'isActive'>[]>([]);
  branches = signal<Branch[]>([]);
  companyFilter = signal<number | null>(null);
  loading = signal(true);
  showForm = signal(false);
  editing = signal<Branch | null>(null);

  filtered = computed(() => {
    const id = this.companyFilter();
    return id ? this.branches().filter((b) => b.companyId === id) : this.branches();
  });

  form = this.fb.group({
    companyId: [null as number | null, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    code: ['', Validators.maxLength(30)],
    address: ['', Validators.maxLength(500)],
    phone: ['', Validators.maxLength(50)],
    isDefault: [false],
    isActive: [true]
  });

  ngOnInit(): void {
    const qp = Number(this.route.snapshot.queryParamMap.get('companyId'));
    if (qp) this.companyFilter.set(qp);
    this.service.companies().subscribe((d) => this.companies.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (d) => { this.branches.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setFilter(value: string): void {
    this.companyFilter.set(Number(value) || null);
  }

  openCreate(): void {
    this.editing.set(null);
    const companyId = this.companyFilter();
    const isFirst = !!companyId && !this.branches().some((b) => b.companyId === companyId);
    this.form.reset({ companyId, isDefault: isFirst, isActive: true });
    this.form.get('companyId')?.enable();
    this.showForm.set(true);
  }

  openEdit(b: Branch): void {
    this.editing.set(b);
    this.form.reset({ ...b });
    this.form.get('companyId')?.disable();  // a branch never moves to another company
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const editing = this.editing();
    if (editing?.isDefault && !v.isDefault) {
      this.toast.error('Every company needs a default branch. Make another branch the default instead.');
      return;
    }
    if (v.isDefault && !v.isActive) {
      this.toast.error('The default branch cannot be disabled.');
      return;
    }
    const req: Observable<unknown> = editing ? this.service.update(editing.id, v as any) : this.service.create(v as any);
    req.subscribe({
      next: () => {
        this.toast.success(editing ? 'Branch updated.' : 'Branch created.');
        this.cancel();
        this.load();
        this.tenant.loadContext().subscribe();
      }
    });
  }

  makeDefault(b: Branch): void {
    if (!confirm(`Make "${b.name}" the default branch of ${b.companyName}?`)) return;
    this.service.setDefault(b.id).subscribe(() => {
      this.toast.success('Default branch changed.');
      this.load();
      this.tenant.loadContext().subscribe();
    });
  }

  remove(b: Branch): void {
    if (!confirm(`Delete branch "${b.name}"? Branches that already have data can only be disabled.`)) return;
    this.service.delete(b.id).subscribe(() => {
      this.toast.success('Branch deleted.');
      this.load();
      this.tenant.loadContext().subscribe();
    });
  }
}
