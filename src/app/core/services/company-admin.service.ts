import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { Branch, Company } from '../models/tenant.model';

/** Super Admin: company master incl. logo upload. */
@Injectable({ providedIn: 'root' })
export class CompanyAdminService {
  private baseUrl = `${environment.apiUrl}/Companies`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<Company[]> {
    return this.http.get<ApiResponse<Company[]>>(this.baseUrl).pipe(map((r) => r.data));
  }
  create(payload: Partial<Company> & { defaultBranchName?: string | null }): Observable<{ id: number }> {
    return this.http.post<ApiResponse<{ id: number }>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }
  update(id: number, payload: Partial<Company>): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/${id}`, payload).pipe(map(() => void 0));
  }
  toggleActive(id: number): Observable<{ isActive: boolean }> {
    return this.http.post<ApiResponse<{ isActive: boolean }>>(`${this.baseUrl}/${id}/toggle-active`, {}).pipe(map((r) => r.data));
  }
  uploadLogo(id: number, file: File): Observable<{ logoPath: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<{ logoPath: string }>>(`${this.baseUrl}/${id}/logo`, form).pipe(map((r) => r.data));
  }
  removeLogo(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}/logo`).pipe(map(() => void 0));
  }
}

/** Branches (BRANCHES permission; exactly one default per company, enforced by the API). */
@Injectable({ providedIn: 'root' })
export class BranchAdminService {
  private baseUrl = `${environment.apiUrl}/Branches`;
  constructor(private http: HttpClient) {}

  /** Companies the logged-in user may manage branches for (all of them for Super Admin). */
  companies(): Observable<Pick<Company, 'id' | 'name' | 'isActive'>[]> {
    return this.http.get<ApiResponse<Pick<Company, 'id' | 'name' | 'isActive'>[]>>(`${this.baseUrl}/companies`).pipe(map((r) => r.data));
  }

  getAll(companyId?: number | null): Observable<Branch[]> {
    const params: Record<string, string> = companyId ? { companyId: String(companyId) } : {};
    return this.http.get<ApiResponse<Branch[]>>(this.baseUrl, { params }).pipe(map((r) => r.data));
  }
  create(payload: Partial<Branch>): Observable<{ id: number }> {
    return this.http.post<ApiResponse<{ id: number }>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }
  update(id: number, payload: Partial<Branch>): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/${id}`, payload).pipe(map(() => void 0));
  }
  setDefault(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/set-default`, {}).pipe(map(() => void 0));
  }
  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => void 0));
  }
}
