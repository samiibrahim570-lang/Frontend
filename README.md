# Fish Feed Mill – Frontend (Angular 19)

Standalone-components Angular 19 app that consumes the ASP.NET Core 8 backend (Sale, Purchase, Production/Pisai, Vouchers, Ledger, Stock Ledger, Gate Pass, Reports, RBAC).

## What's included
- **Modern, VIP-style dashboard** — gradient welcome banner with live greeting, icon-coded stat cards, one-click quick links to Sale/Purchase/Production/Gate Pass/Reports
- **JWT login** with token stored in `localStorage`, auto-attached to every request, split-screen modern login page with show/hide password
- **Global error handling** — 401 auto-logout + redirect, 403/other errors shown as toasts
- **Grouped, modern sidebar** — menus organized to mirror the real business flow: Overview → Masters → Transactions → Accounts → Reports → Administration, each with its own icon, collapsible, fully mobile-responsive (hamburger + slide-in on phones)
- **Route guards**: `authGuard` + `permissionGuard('MENU_KEY')` on every route
- **Button-level permission checks** everywhere (`auth.canCreate/canEdit/canDelete/canPrint`)
- **Dedicated print system** (`pages/print/*`) — "Print" opens a clean, chrome-free formatted document in a new tab and triggers the print dialog automatically:
  - Sale Invoice, Purchase Invoice — company header, bill-to box, item table, totals, signatures
  - Production/Pisai slip — raw material + output tables, wastage summary
  - Voucher slip — receipt/payment/journal format
  - Gate Pass — trip details + every linked invoice's full item detail + grand totals
  - Customer/Supplier Ledger statement — opening/closing balance, running balance
  - Item Stock Ledger — opening/closing stock, movement history
  - Sale/Purchase/Production/Stock Reports — formatted report layout with totals
- **Excel export everywhere** (`core/services/export.service.ts`, powered by SheetJS `xlsx`):
  - Every list page (Sale, Purchase, Production, Vouchers, Gate Pass, Customers, Suppliers, Items, Categories, Bookers) has an **⬇ Export** button
  - Ledger and Stock Ledger statements export their currently-displayed entries
  - Reports page has **Export This Report** (active tab) and **Export Whole Application** (one workbook, one tab per module: Sales, Purchases, Production, Vouchers, Customers, Suppliers, Bookers, Categories, Items, Customer/Supplier Balances)
- **Production page fix** — now shows a clear warning banner + precise save-error messages when no item is marked "Raw Material" / "Finished Good" yet (previously failed silently with a generic error)
- Full pages: Dashboard, Category, Item, Customer, Supplier, Booker, Sale, Purchase, Production/Pisai, Vouchers, Ledger, Stock Ledger, Gate Pass, Reports, User Management, Roles & Permission matrix

## Project structure
```
src/app/
 ├─ core/
 │   ├─ models/        → TypeScript interfaces matching the backend DTOs
 │   ├─ services/       → HTTP services (one per backend controller) + AuthService + generic CrudService
 │   ├─ interceptors/    → JWT attach + global error handling
 │   └─ guards/          → authGuard, permissionGuard
 ├─ layout/              → sidebar + topbar shell wrapping every authenticated page
 ├─ shared/
 │   ├─ components/icon/ → small original SVG icon set (no external icon library)
 │   ├─ components/toast-container/
 │   └─ config/          → menu-groups.config.ts (sidebar section grouping)
 ├─ pages/
 │   ├─ auth/            → modern split-screen login
 │   ├─ dashboard/, masters/, sale/, purchase/, production/, voucher/, ledger/, stock-ledger/, gate-pass/, reports/, settings/
 │   └─ print/           → chrome-free print routes (sale-invoice, purchase-invoice, gate-pass-print, ledger-print, stock-ledger-print, report-print)
 └─ app.routes.ts        → all routes, lazy-loaded; print/* routes sit outside the sidebar layout
```

## Setup

### 1. Install dependencies
```bash
npm install
```
This installs Angular plus `xlsx` (SheetJS, used for the Excel export feature).

### 2. Point the app at your backend
Edit `src/environments/environment.ts` (dev) and `src/environments/environment.prod.ts` (prod build):
```ts
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7220/api'   // <-- your ASP.NET Core API URL
};
```

### 3. Run
```bash
npm start
# or: ng serve
```
Opens at `http://localhost:4200`. Make sure the backend is running and CORS is enabled (it already is, `AllowAll` policy, in the provided backend).

### 4. Build for production
```bash
npm run build
```
Output goes to `dist/fishfeedmill-frontend`. Deploy that folder to any static host / IIS / Nginx.

### Default login
```
Username: admin
Password: Admin@123
```

## Notes
- `node_modules` is not included in this zip (to keep the download small) — run `npm install` first.
- The build was verified with `ng build --configuration production` in this environment and compiles with zero errors.
- If your backend uses a self-signed HTTPS certificate in development, either trust the ASP.NET Core dev cert (`dotnet dev-certs https --trust`) or switch `apiUrl` to the `http://localhost:5220/api` profile.
- Gate Pass, Ledger, and Stock Ledger pages have a **Print** button that uses the browser's native print dialog — add print-specific CSS later if you want a formatted physical slip.
