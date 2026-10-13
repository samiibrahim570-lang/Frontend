import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleMenuPermissionService, RoleService } from '../../../core/services/rbac.service';
import { Role, RoleMenuPermissionRow } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './roles.component.html'
})
export class RolesComponent implements OnInit {
  private roleService = inject(RoleService);
  private permissionService = inject(RoleMenuPermissionService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  roles = signal<Role[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  selectedRole = signal<Role | null>(null);
  permissionRows = signal<RoleMenuPermissionRow[]>([]);
  savingPermissions = signal(false);

  form = this.fb.group({
    roleName: ['', Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.roleService.getAll().subscribe({
      next: (d) => { this.roles.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset();
    this.showForm.set(true);
  }

  openEdit(r: Role): void {
    this.editingId.set(r.id);
    this.form.reset({ roleName: r.roleName, description: r.description });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload = this.form.getRawValue();
    const id = this.editingId();
    const req = id ? this.roleService.update(id, payload) : this.roleService.create(payload);
    req.subscribe({
      next: () => { this.toast.success(id ? 'Role updated.' : 'Role created.'); this.cancelForm(); this.load(); }
    });
  }

  remove(r: Role): void {
    if (!confirm(`Delete role "${r.roleName}"?`)) return;
    this.roleService.delete(r.id).subscribe({ next: () => { this.toast.success('Role deleted.'); this.load(); } });
  }

  selectRole(r: Role): void {
    this.selectedRole.set(r);
    this.showForm.set(false);
    this.permissionService.getByRole(r.id).subscribe((rows) => this.permissionRows.set(rows));
  }

  toggleAll(row: RoleMenuPermissionRow, value: boolean): void {
    row.canView = value;
    row.canCreate = value;
    row.canEdit = value;
    row.canDelete = value;
    row.canPrint = value;
  }

  savePermissions(): void {
    const role = this.selectedRole();
    if (!role) return;
    this.savingPermissions.set(true);
    this.permissionService.assign(role.id, this.permissionRows()).subscribe({
      next: () => { this.savingPermissions.set(false); this.toast.success(`Permissions saved for "${role.roleName}".`); },
      error: () => this.savingPermissions.set(false)
    });
  }
}
