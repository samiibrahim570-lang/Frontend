import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, tap, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { AccessibleCompany, Letterhead, SessionContext } from '../models/tenant.model';

/** Read by tenantInterceptor (plain localStorage so the interceptor has no DI dependency on this service). */
export const COMPANY_KEY = 'ffm_company';
export const BRANCH_KEY = 'ffm_branch';

/**
 * Selected company + branch for this browser. Every API call carries them as X-Company-Id / X-Branch-Id
 * headers; the API verifies the user may use them. The server also remembers the last selection per user.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private baseUrl = `${environment.apiUrl}/Session`;
  private letterhead$?: Observable<Letterhead | null>;
  private letterheadKey = '';

  readonly context = signal<SessionContext | null>(null);
  /** Last loaded letterhead, used synchronously by Excel exports. */
  readonly currentLetterhead = signal<Letterhead | null>(null);
  readonly companyId = signal<number | null>(readId(COMPANY_KEY));
  readonly branchId = signal<number | null>(readId(BRANCH_KEY));

  readonly companies = computed<AccessibleCompany[]>(() => this.context()?.companies ?? []);
  readonly currentCompany = computed(() => this.companies().find((c) => c.id === this.companyId()) ?? null);
  readonly branches = computed(() => this.currentCompany()?.branches ?? []);
  readonly currentBranch = computed(() => this.branches().find((b) => b.id === this.branchId()) ?? null);

  constructor(private http: HttpClient) {}

  /** Loads the companies/branches the user may use and fixes up a stale local selection. */
  loadContext(): Observable<SessionContext | null> {
    return this.http.get<ApiResponse<SessionContext>>(`${this.baseUrl}/context`).pipe(
      map((r) => r.data),
      tap((ctx) => {
        this.context.set(ctx);
        const company = ctx.companies.find((c) => c.id === this.companyId());
        const branchOk = company?.branches.some((b) => b.id === this.branchId());
        if (!company || !branchOk) this.setSelection(ctx.currentCompanyId, ctx.currentBranchId);
      }),
      catchError(() => of(null))
    );
  }

  /** Switch company (its default branch unless a branch is given) and reload so every screen refetches. */
  switchTo(companyId: number, branchId?: number | null): void {
    this.http
      .post<ApiResponse<{ companyId: number; branchId: number }>>(`${this.baseUrl}/switch`, { companyId, branchId: branchId ?? null })
      .subscribe((r) => {
        this.setSelection(r.data.companyId, r.data.branchId);
        window.location.reload();
      });
  }

  /** Cached per company/branch; used by every print page and Excel export header. */
  letterhead(): Observable<Letterhead | null> {
    const key = `${this.companyId()}-${this.branchId()}`;
    if (!this.letterhead$ || this.letterheadKey !== key) {
      this.letterheadKey = key;
      this.letterhead$ = this.http.get<ApiResponse<Letterhead>>(`${this.baseUrl}/letterhead`).pipe(
        map((r) => r.data),
        tap((l) => this.currentLetterhead.set(l)),
        catchError(() => of(null)),
        shareReplay(1)
      );
    }
    return this.letterhead$;
  }

  /** Logos are stored by the API under /uploads/...; turn the relative path into an absolute URL. */
  logoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return environment.apiUrl.replace(/\/api\/?$/, '') + path;
  }

  clear(): void {
    localStorage.removeItem(COMPANY_KEY);
    localStorage.removeItem(BRANCH_KEY);
    this.companyId.set(null);
    this.branchId.set(null);
    this.context.set(null);
    this.letterhead$ = undefined;
  }

  private setSelection(companyId: number | null, branchId: number | null): void {
    this.companyId.set(companyId);
    this.branchId.set(branchId);
    if (companyId) localStorage.setItem(COMPANY_KEY, String(companyId)); else localStorage.removeItem(COMPANY_KEY);
    if (branchId) localStorage.setItem(BRANCH_KEY, String(branchId)); else localStorage.removeItem(BRANCH_KEY);
  }
}

function readId(key: string): number | null {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) && v > 0 ? v : null;
}
