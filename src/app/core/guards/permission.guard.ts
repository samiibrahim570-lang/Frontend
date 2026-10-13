import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Usage in routes: canActivate: [permissionGuard('SALE')]
 * Blocks navigation if the logged-in user's role doesn't have "View" permission for that menu.
 */
export function permissionGuard(menuKey: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.canView(menuKey)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
}
