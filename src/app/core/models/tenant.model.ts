export interface AccessibleBranch {
  id: number;
  name: string;
  code: string | null;
  isDefault: boolean;
}

export interface AccessibleCompany {
  id: number;
  name: string;
  logoPath: string | null;
  branches: AccessibleBranch[];
}

export interface SessionContext {
  isSuperAdmin: boolean;
  currentCompanyId: number | null;
  currentBranchId: number | null;
  companies: AccessibleCompany[];
}

/** Company + selected branch details printed at the top of every document/report. */
export interface Letterhead {
  companyId: number;
  companyName: string;
  logoPath: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  ntnNo: string | null;
  strnNo: string | null;
  website: string | null;
  branchId: number;
  branchName: string;
  branchAddress: string | null;
  branchPhone: string | null;
}

export interface Company {
  id: number;
  name: string;
  logoPath: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  ntnNo: string | null;
  strnNo: string | null;
  website: string | null;
  tagline: string | null;
  isActive: boolean;
  branchCount?: number;
  defaultBranchName?: string | null;
}

export interface Branch {
  id: number;
  companyId: number;
  companyName?: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface SearchResult {
  type: string;
  title: string;
  subtitle: string | null;
  route: string;
  id: number | null;
}
