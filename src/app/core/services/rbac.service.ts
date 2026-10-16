import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { AppUser, Menu, Role, RoleMenuPermissionRow } from '../models/auth.model';
import { CrudService } from './crud.service';

@Injectable({ providedIn: 'root' })
export class RoleService extends CrudService<Role> {
  constructor(http: HttpClient) {
    super(http, 'Roles');
  }
}

@Injectable({ providedIn: 'root' })
export class MenuService extends CrudService<Menu> {
  constructor(http: HttpClient) {
    super(http, 'Menus');
  }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = `${environment.apiUrl}/Users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AppUser[]> {
    return this.http.get<ApiResponse<AppUser[]>>(this.baseUrl).pipe(map((r) => r.data));
  }

  getById(id: number): Observable<AppUser> {
    return this.http.get<ApiResponse<AppUser>>(`${this.baseUrl}/${id}`).pipe(map((r) => r.data));
  }

  create(payload: {
    fullName: string;
    userName: string;
    email?: string | null;
    phone?: string | null;
    password: string;
    roleId: number;
    branchIds: number[];
  }): Observable<{ id: number; userName: string }> {
    return this.http
      .post<ApiResponse<{ id: number; userName: string }>>(this.baseUrl, payload)
      .pipe(map((r) => r.data));
  }

  update(
    id: number,
    payload: { fullName: string; email?: string | null; phone?: string | null; roleId: number; isActive: boolean; branchIds?: number[] }
  ): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/${id}`, payload).pipe(map(() => void 0));
  }

  changePassword(id: number, oldPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${id}/change-password`, { oldPassword, newPassword })
      .pipe(map(() => void 0));
  }

  /** Super Admin sets a new password without the old one. */
  resetPassword(id: number, newPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${id}/reset-password`, { newPassword })
      .pipe(map(() => void 0));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => void 0));
  }
}

@Injectable({ providedIn: 'root' })
export class RoleMenuPermissionService {
  private baseUrl = `${environment.apiUrl}/RoleMenuPermissions`;

  constructor(private http: HttpClient) {}

  getByRole(roleId: number): Observable<RoleMenuPermissionRow[]> {
    return this.http
      .get<ApiResponse<RoleMenuPermissionRow[]>>(`${this.baseUrl}/role/${roleId}`)
      .pipe(map((r) => r.data));
  }

  assign(roleId: number, permissions: RoleMenuPermissionRow[]): Observable<void> {
    const payload = {
      roleId,
      permissions: permissions.map((p) => ({
        menuId: p.menuId,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canPrint: p.canPrint
      }))
    };
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/assign`, payload).pipe(map(() => void 0));
  }
}
