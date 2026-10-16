export interface MenuGroupConfig {
  label: string;
  icon: string;
  keys: string[];
}

/**
 * Groups the flat permissions[] list (from login) into sections that mirror
 * how the mill actually works day to day:
 *   Overview -> Masters (setup once) -> Transactions (daily work) ->
 *   Accounts (money/stock tracking) -> Reports -> Administration
 */
export const MENU_GROUPS: MenuGroupConfig[] = [
  { label: 'Overview', icon: 'dashboard', keys: ['DASHBOARD'] },
  { label: 'Masters', icon: 'category', keys: ['CATEGORY', 'ITEM', 'CUSTOMER', 'SUPPLIER', 'BOOKER'] },
  { label: 'Transactions', icon: 'sale', keys: ['SALE', 'SALERETURN', 'PURCHASE', 'PURCHASERETURN', 'PRODUCTION', 'VOUCHER', 'GATEPASS'] },
  { label: 'Accounts', icon: 'ledger', keys: ['LEDGER', 'STOCKLEDGER'] },
  { label: 'Reports', icon: 'reports', keys: ['REPORTS'] },
  { label: 'Administration', icon: 'roles', keys: ['COMPANIES', 'BRANCHES', 'USERS', 'ROLES'] }
];

// Maps a MenuKey to an icon name used by <app-icon>
export const MENU_ICON_MAP: Record<string, string> = {
  DASHBOARD: 'dashboard',
  CATEGORY: 'category',
  ITEM: 'item',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  BOOKER: 'booker',
  SALE: 'sale',
  PURCHASE: 'purchase',
  PRODUCTION: 'production',
  VOUCHER: 'voucher',
  LEDGER: 'ledger',
  STOCKLEDGER: 'stockledger',
  GATEPASS: 'gatepass',
  REPORTS: 'reports',
  USERS: 'users',
  ROLES: 'roles',
  SALERETURN: 'salereturn',
  PURCHASERETURN: 'purchasereturn',
  COMPANIES: 'company',
  BRANCHES: 'branch'
};
