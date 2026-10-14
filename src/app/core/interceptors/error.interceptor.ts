import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { SILENT_ERRORS } from './http-context';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      if (req.context.get(SILENT_ERRORS) && error.status !== 401) {
        return throwError(() => error);
      }
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
        toast.error('Session expired. Please login again.');
      } else if (error.status === 403) {
        toast.error(error.error?.message || "Access denied. You don't have permission for this action.");
      } else {
        const message = error.error?.message || error.message || 'Something went wrong.';
        toast.error(message);
      }
      return throwError(() => error);
    })
  );
};
