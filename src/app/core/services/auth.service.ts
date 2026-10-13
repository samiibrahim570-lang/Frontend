import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { CurrentUser, LoginRequest, LoginResponse, MenuPermission } from '../models/auth.model';

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

  isAdmin(): boolean {
    return this.currentUser?.roleName?.toLowerCase() === 'admin';
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
