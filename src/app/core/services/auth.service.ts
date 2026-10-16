import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { CurrentUser, LoginRequest, LoginResponse, MenuPermission } from '../models/auth.model';
import { BRANCH_KEY, COMPANY_KEY } from './tenant.service';

const TOKEN_KEY = 'ffm_token';
const USER_KEY = 'ffm_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(this.loadUserFromStorage());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  private loadUserFromStorage(): CurrentUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  login(request: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/Auth/login`, request).pipe(
      tap((res) => {
        if (res.success && res.data) {
          localStorage.setItem(TOKEN_KEY, res.data.token);
          const user: CurrentUser = {
            userId: res.data.userId,
            fullName: res.data.fullName,
            userName: res.data.userName,
            roleName: res.data.roleName,
            isSuperAdmin: res.data.isSuperAdmin,
            permissions: res.data.permissions
          };
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // the next user may not have access to this company/branch; the server remembers their own last selection
    localStorage.removeItem(COMPANY_KEY);
    localStorage.removeItem(BRANCH_KEY);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get currentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /** Admin and Super Admin bypass menu permissions (same rule as the API). */
  isAdmin(): boolean {
    const role = this.currentUser?.roleName?.toLowerCase();
    return role === 'admin' || this.isSuperAdmin();
  }

  /** Super Admin manages companies, branches and users and can work in every company. */
  isSuperAdmin(): boolean {
    return !!this.currentUser?.isSuperAdmin || this.currentUser?.roleName?.toLowerCase() === 'super admin';
  }

  private findPermission(menuKey: string): MenuPermission | undefined {
    return this.currentUser?.permissions.find(
      (p) => p.menuKey.toUpperCase() === menuKey.toUpperCase()
    );
  }

  canView(menuKey: string): boolean {
    return this.isAdmin() || !!this.findPermission(menuKey)?.canView;
  }
  canCreate(menuKey: string): boolean {
    return this.isAdmin() || !!this.findPermission(menuKey)?.canCreate;
  }
  canEdit(menuKey: string): boolean {
    return this.isAdmin() || !!this.findPermission(menuKey)?.canEdit;
  }
  canDelete(menuKey: string): boolean {
    return this.isAdmin() || !!this.findPermission(menuKey)?.canDelete;
  }
  canPrint(menuKey: string): boolean {
    return this.isAdmin() || !!this.findPermission(menuKey)?.canPrint;
  }

  get visibleMenus(): MenuPermission[] {
    return this.currentUser?.permissions.filter((p) => p.canView) ?? [];
  }
}
