import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TenantService } from '../../core/services/tenant.service';

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
  private tenant = inject(TenantService);

  loading = false;
  showPassword = false;

  form = this.fb.group({
    userName: ['', Validators.required],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService.login(this.form.getRawValue() as any).subscribe({
      next: (res) => {
        if (res.success) {
          // restore the user's last (or default) company/branch before the first screen loads
          this.tenant.loadContext().subscribe(() => {
            this.loading = false;
            this.toast.success(`Welcome back, ${res.data.fullName}`);
            this.router.navigate(['/dashboard']);
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
