import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BRANCH_KEY, COMPANY_KEY } from '../services/tenant.service';

/** Sends the selected company/branch with every API call; the API validates them against the user's access. */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const companyId = localStorage.getItem(COMPANY_KEY);
  const branchId = localStorage.getItem(BRANCH_KEY);
  if (!companyId || !branchId) return next(req);

  return next(req.clone({ setHeaders: { 'X-Company-Id': companyId, 'X-Branch-Id': branchId } }));
};
