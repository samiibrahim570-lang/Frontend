export interface LoginRequest {
  userName: string;
  password: string;
}

export interface MenuPermission {
  menuId: number;
  menuName: string;
  menuKey: string;
  parentId: number | null;
  icon: string | null;
  route: string | null;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId: number;
  fullName: string;
  userName: string;
  roleName: string;
  permissions: MenuPermission[];
}

export interface CurrentUser {
  userId: number;
  fullName: string;
  userName: string;
  roleName: string;
  permissions: MenuPermission[];
}

export interface Role {
  id: number;
  roleName: string;
  description: string | null;
}

export interface Menu {
  id: number;
  menuName: string;
  menuKey: string;
  parentId: number | null;
  icon: string | null;
  route: string | null;
  displayOrder: number;
}

export interface RoleMenuPermissionRow {
  menuId: number;
  menuName: string;
  menuKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

export interface AppUser {
  id: number;
  fullName: string;
  userName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  roleName: string;
  roleId: number;
  lastLoginAt: string | null;
}
