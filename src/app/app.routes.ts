import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent) },

  // Print routes: no sidebar/topbar shell - just the formatted document + a Print/Close toolbar
  {
    path: 'print/sale/:id',
    loadComponent: () => import('./pages/print/sale-invoice/sale-invoice-print.component').then(m => m.SaleInvoicePrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'print/purchase/:id',
    loadComponent: () => import('./pages/print/purchase-invoice/purchase-invoice-print.component').then(m => m.PurchaseInvoicePrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'print/gate-pass/:id',
    loadComponent: () => import('./pages/print/gate-pass-print/gate-pass-print.component').then(m => m.GatePassPrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'print/production/:id',
    loadComponent: () => import('./pages/print/production-print/production-print.component').then(m => m.ProductionPrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'print/voucher/:id',
    loadComponent: () => import('./pages/print/voucher-print/voucher-print.component').then(m => m.VoucherPrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'print/ledger/:type/:id',
    loadComponent: () => import('./pages/print/ledger-print/ledger-print.component').then(m => m.LedgerPrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'print/stock-ledger/:id',
    loadComponent: () => import('./pages/print/stock-ledger-print/stock-ledger-print.component').then(m => m.StockLedgerPrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'print/report/:type',
    loadComponent: () => import('./pages/print/report-print/report-print.component').then(m => m.ReportPrintComponent),
    canActivate: [authGuard]
  },

  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [permissionGuard('DASHBOARD')]
      },
      {
        path: 'masters/category',
        loadComponent: () => import('./pages/masters/category/category.component').then(m => m.CategoryComponent),
        canActivate: [permissionGuard('CATEGORY')]
      },
      {
        path: 'masters/item',
        loadComponent: () => import('./pages/masters/item/item.component').then(m => m.ItemComponent),
        canActivate: [permissionGuard('ITEM')]
      },
      {
        path: 'masters/customer',
        loadComponent: () => import('./pages/masters/customer/customer.component').then(m => m.CustomerComponent),
        canActivate: [permissionGuard('CUSTOMER')]
      },
      {
        path: 'masters/supplier',
        loadComponent: () => import('./pages/masters/supplier/supplier.component').then(m => m.SupplierComponent),
        canActivate: [permissionGuard('SUPPLIER')]
      },
      {
        path: 'masters/booker',
        loadComponent: () => import('./pages/masters/booker/booker.component').then(m => m.BookerComponent),
        canActivate: [permissionGuard('BOOKER')]
      },
      {
        path: 'sale',
        loadComponent: () => import('./pages/sale/sale.component').then(m => m.SaleComponent),
        canActivate: [permissionGuard('SALE')]
      },
      {
        path: 'purchase',
        loadComponent: () => import('./pages/purchase/purchase.component').then(m => m.PurchaseComponent),
        canActivate: [permissionGuard('PURCHASE')]
      },
      {
        path: 'production',
        loadComponent: () => import('./pages/production/production.component').then(m => m.ProductionComponent),
        canActivate: [permissionGuard('PRODUCTION')]
      },
      {
        path: 'voucher',
        loadComponent: () => import('./pages/voucher/voucher.component').then(m => m.VoucherComponent),
        canActivate: [permissionGuard('VOUCHER')]
      },
      {
        path: 'ledger',
        loadComponent: () => import('./pages/ledger/ledger.component').then(m => m.LedgerComponent),
        canActivate: [permissionGuard('LEDGER')]
      },
      {
        path: 'stock-ledger',
        loadComponent: () => import('./pages/stock-ledger/stock-ledger.component').then(m => m.StockLedgerComponent),
        canActivate: [permissionGuard('STOCKLEDGER')]
      },
      {
        path: 'gate-pass',
        loadComponent: () => import('./pages/gate-pass/gate-pass.component').then(m => m.GatePassComponent),
        canActivate: [permissionGuard('GATEPASS')]
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [permissionGuard('REPORTS')]
      },
      {
        path: 'settings/users',
        loadComponent: () => import('./pages/settings/users/users.component').then(m => m.UsersComponent),
        canActivate: [permissionGuard('USERS')]
      },
      {
        path: 'settings/roles',
        loadComponent: () => import('./pages/settings/roles/roles.component').then(m => m.RolesComponent),
        canActivate: [permissionGuard('ROLES')]
      }
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];
