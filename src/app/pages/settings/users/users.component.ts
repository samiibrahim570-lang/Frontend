import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleService, UserService } from '../../../core/services/rbac.service';
import { AppUser, Role } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  users = signal<AppUser[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  form = this.fb.group({
    fullName: ['', Validators.required],
    userName: ['', Validators.required],
    email: [''],
    phone: [''],
    password: [''],
    roleId: [null as number | null, Validators.required],
    isActive: [true]
  });

  ngOnInit(): void {
    this.roleService.getAll().subscribe((d) => this.roles.set(d));
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
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.form.get('password')?.updateValueAndValidity();
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
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.get('userName')?.enable();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const id = this.editingId();

    if (id) {
      this.userService.update(id, { fullName: v.fullName!, email: v.email, phone: v.phone, roleId: v.roleId!, isActive: v.isActive! })
        .subscribe({ next: () => { this.toast.success('User updated.'); this.cancel(); this.load(); } });
    } else {
      this.userService.create({ fullName: v.fullName!, userName: v.userName!, email: v.email, phone: v.phone, password: v.password!, roleId: v.roleId! })
        .subscribe({ next: () => { this.toast.success('User created.'); this.cancel(); this.load(); } });
    }
  }

  remove(u: AppUser): void {
    if (!confirm(`Deactivate/delete user "${u.userName}"?`)) return;
    this.userService.delete(u.id).subscribe({ next: () => { this.toast.success('User deleted.'); this.load(); } });
  }

  resetPassword(u: AppUser): void {
    const newPassword = prompt(`New password for ${u.userName}:`);
    if (!newPassword) return;
    // Admin reset requires the current password field of change-password endpoint;
    // since this is an admin-only page, we reuse the same endpoint - the API validates old password,
    // so this direct reset is best done via a dedicated admin-reset endpoint. Left as a manual note.
    this.toast.info('Password changes go through the user\'s own change-password flow for security.');
  }
}
