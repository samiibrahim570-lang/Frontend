import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleService, UserService } from '../../../core/services/rbac.service';
import { BranchAdminService } from '../../../core/services/company-admin.service';
import { AppUser, Role } from '../../../core/models/auth.model';
import { Branch } from '../../../core/models/tenant.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface CompanyGroup { companyId: number; companyName: string; branches: Branch[]; }

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private branchService = inject(BranchAdminService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  users = signal<AppUser[]>([]);
  roles = signal<Role[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);
  selectedBranchIds = signal<Set<number>>(new Set());
  selectedRoleId = signal<number | null>(null);

  /** All active branches grouped under their company, for the access checkbox tree. */
  companyGroups = computed<CompanyGroup[]>(() => {
    const groups: CompanyGroup[] = [];
    for (const b of this.branches().filter((x) => x.isActive)) {
      let g = groups.find((x) => x.companyId === b.companyId);
      if (!g) groups.push((g = { companyId: b.companyId, companyName: b.companyName ?? '', branches: [] }));
      g.branches.push(b);
    }
    return groups;
  });

  /** Super Admin sees every company - no assignment needed. */
  selectedRoleIsSuperAdmin = computed(() =>
    this.roles().find((r) => r.id === this.selectedRoleId())?.roleName.toLowerCase() === 'super admin');

  form = this.fb.group({
    fullName: ['', Validators.required],
    userName: ['', Validators.required],
    email: ['', Validators.email],
    phone: [''],
    password: [''],
    roleId: [null as number | null, Validators.required],
    isActive: [true]
  });

  ngOnInit(): void {
    this.roleService.getAll().subscribe((d) => this.roles.set(d));
    this.branchService.getAll().subscribe((d) => this.branches.set(d));
    this.form.get('roleId')!.valueChanges.subscribe((v) => this.selectedRoleId.set(v));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.userService.getAll().subscribe({
      next: (d) => { this.users.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ isActive: true });
    this.form.get('userName')?.enable();
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.selectedBranchIds.set(new Set());
    this.showForm.set(true);
  }

  openEdit(u: AppUser): void {
    this.editingId.set(u.id);
    this.form.reset({
      fullName: u.fullName, userName: u.userName, email: u.email, phone: u.phone,
      roleId: u.roleId, isActive: u.isActive
    });
    this.form.get('userName')?.disable();
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.selectedBranchIds.set(new Set((u.access ?? []).map((a) => a.branchId)));
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.get('userName')?.enable();
  }

  isBranchSelected(id: number): boolean {
    return this.selectedBranchIds().has(id);
  }

  toggleBranch(id: number, checked: boolean): void {
    const next = new Set(this.selectedBranchIds());
    if (checked) next.add(id); else next.delete(id);
    this.selectedBranchIds.set(next);
  }

  companyState(g: CompanyGroup): 'all' | 'some' | 'none' {
    const n = g.branches.filter((b) => this.selectedBranchIds().has(b.id)).length;
    return n === 0 ? 'none' : n === g.branches.length ? 'all' : 'some';
  }

  toggleCompany(g: CompanyGroup, checked: boolean): void {
    const next = new Set(this.selectedBranchIds());
    for (const b of g.branches) { if (checked) next.add(b.id); else next.delete(b.id); }
    this.selectedBranchIds.set(next);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const branchIds = [...this.selectedBranchIds()];
    if (!this.selectedRoleIsSuperAdmin() && branchIds.length === 0) {
      this.toast.error('Assign at least one company branch to this user.');
      return;
    }
    const v = this.form.getRawValue();
    const id = this.editingId();

    if (id) {
      this.userService.update(id, { fullName: v.fullName!, email: v.email, phone: v.phone, roleId: v.roleId!, isActive: v.isActive!, branchIds })
        .subscribe({ next: () => { this.toast.success('User updated.'); this.cancel(); this.load(); } });
    } else {
      this.userService.create({ fullName: v.fullName!, userName: v.userName!, email: v.email, phone: v.phone, password: v.password!, roleId: v.roleId!, branchIds })
        .subscribe({ next: () => { this.toast.success('User created.'); this.cancel(); this.load(); } });
    }
  }

  accessSummary(u: AppUser): string {
    if (u.roleName.toLowerCase() === 'super admin') return 'All companies';
    const byCompany = new Map<string, string[]>();
    for (const a of u.access ?? []) byCompany.set(a.companyName, [...(byCompany.get(a.companyName) ?? []), a.branchName]);
    return [...byCompany].map(([c, b]) => `${c}: ${b.join(', ')}`).join(' | ') || 'No access';
  }

  remove(u: AppUser): void {
    if (!confirm(`Deactivate/delete user "${u.userName}"?`)) return;
    this.userService.delete(u.id).subscribe({ next: () => { this.toast.success('User deleted.'); this.load(); } });
  }

  resetPassword(u: AppUser): void {
    const newPassword = prompt(`New password for ${u.userName} (min 6 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 6) { this.toast.error('Password must be at least 6 characters.'); return; }
    this.userService.resetPassword(u.id, newPassword).subscribe(() => this.toast.success('Password reset.'));
  }
}
