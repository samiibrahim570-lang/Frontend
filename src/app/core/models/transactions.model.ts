// ---------------- PRODUCTION / PISAI ----------------
export interface ProductionRawMaterialLine {
  itemId: number;
  quantity: number;
  rate: number;
}
export interface ProductionOutputLine {
  itemId: number;
  quantity: number;
  rate: number;
}
export interface CreateProductionRequest {
  productionDate: string;
  wastageQty: number;
  remarks?: string | null;
  rawMaterials: ProductionRawMaterialLine[];
  outputs: ProductionOutputLine[];
}
export interface ProductionRawMaterialResponse {
  itemId: number;
  itemName: string;
  quantity: number;
  rate: number;
  amount: number;
}
export interface ProductionOutputResponse {
  itemId: number;
  itemName: string;
  quantity: number;
  rate: number;
  amount: number;
}
export interface ProductionResponse {
  id: number;
  productionNo: string;
  productionDate: string;
  totalRawMaterialQty: number;
  totalOutputQty: number;
  wastageQty: number;
  remarks: string | null;
  status: string;
  rawMaterials: ProductionRawMaterialResponse[];
  outputs: ProductionOutputResponse[];
}

// ---------------- VOUCHER (Debit/Credit) ----------------
export interface CreateVoucherRequest {
  voucherDate: string;
  voucherType: 'Receipt' | 'Payment' | 'JournalDebit' | 'JournalCredit';
  partyType: 'Customer' | 'Supplier' | 'Other';
  customerId?: number | null;
  supplierId?: number | null;
  amount: number;
  paymentMode: 'Cash' | 'Bank' | 'Cheque' | 'Online';
  referenceNo?: string | null;
  narration?: string | null;
}
export interface VoucherResponse {
  id: number;
  voucherNo: string;
  voucherDate: string;
  voucherType: string;
  partyType: string;
  partyName: string | null;
  amount: number;
  paymentMode: string;
  referenceNo: string | null;
  narration: string | null;
  status: string;
}

// ---------------- LEDGER ----------------
export interface LedgerEntry {
  transactionDate: string;
  sourceType: string;
  refNo: string | null;
  narration: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}
export interface LedgerReport {
  partyName: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
}
export interface PartyBalanceSummary {
  partyId: number;
  code: string;
  name: string;
  openingBalance: number;
  currentBalance: number;
}

// ---------------- STOCK LEDGER ----------------
export interface StockLedgerEntry {
  transactionDate: string;
  sourceType: string;
  refNo: string | null;
  narration: string | null;
  inQty: number;
  outQty: number;
  rate: number;
  runningBalance: number;
}
export interface ItemStockLedger {
  itemId: number;
  itemCode: string;
  itemName: string;
  unitOfMeasure: string;
  openingStock: number;
  closingStock: number;
  totalIn: number;
  totalOut: number;
  entries: StockLedgerEntry[];
}

// ---------------- GATE PASS ----------------
export interface CreateGatePassRequest {
  gatePassNo?: string | null;
  gatePassDate: string;
  gatePassType: 'Sale' | 'Purchase';
  bookerId?: number | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  remarks?: string | null;
  confirm?: boolean;
  invoiceIds: number[];
}
export interface GatePassPickableInvoice {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  partyName: string;
  driverName?: string | null;
  vehicleNumber?: string | null;
  bookerId?: number | null;
  totalQuantity: number;
  netAmount: number;
  onGatePassNo?: string | null;
}
export interface GatePassItemDetail {
  itemId: number;
  itemName: string;
  unitOfMeasure: string;
  quantity: number;
  rate: number;
  discountAmount: number;
  totalAmount: number;
}
export interface GatePassInvoiceLine {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  partyName: string;
  totalQuantity: number;
  netAmount: number;
  items: GatePassItemDetail[];
}
export interface GatePassResponse {
  id: number;
  gatePassNo: string;
  gatePassDate: string;
  gatePassType: string;
  bookerName: string | null;
  driverName: string | null;
  vehicleNumber: string | null;
  remarks: string | null;
  status: string;
  totalInvoices: number;
  grandTotalQuantity: number;
  grandTotalAmount: number;
  invoices: GatePassInvoiceLine[];
}

// ---------------- REPORTS ----------------
export interface SaleReportItem {
  invoiceDate: string;
  invoiceNo: string;
  customerName: string;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  returnAmount: number;
  netAfterReturn: number;
}
export interface PurchaseReportItem {
  invoiceDate: string;
  invoiceNo: string;
  supplierName: string;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  returnAmount: number;
  netAfterReturn: number;
}

/** Sale Return / Purchase Return report row (party = customer or supplier). */
export interface ReturnReportItem {
  returnDate: string;
  returnNo: string;
  invoiceNo: string;
  partyName: string;
  totalAmount: number;
  deductionAmount: number;
  netAmount: number;
  refundAmount: number;
  balanceAmount: number;
}
export interface ProductionReportItem {
  productionDate: string;
  productionNo: string;
  totalRawMaterialQty: number;
  totalOutputQty: number;
  wastageQty: number;
}
export interface StockReportItem {
  itemCode: string;
  itemName: string;
  categoryName: string;
  unitOfMeasure: string;
  openingStock: number;
  currentStock: number;
  reorderLevel: number;
}
export interface DashboardSummary {
  todaySales: number;
  todayPurchases: number;
  totalReceivable: number;
  totalPayable: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalItems: number;
  lowStockItemsCount: number;
}

// ---------------- DASHBOARD ANALYTICS ----------------
export interface NamedAmount { name: string; amount: number; }
export interface RankedAmount extends NamedAmount { previousAmount: number; invoices: number; }
export interface DashboardKpis {
  sales: number; previousSales: number;
  purchases: number; previousPurchases: number;
  saleReturns: number; purchaseReturns: number; netSales: number;
  saleInvoices: number; previousSaleInvoices: number; averageInvoice: number;
  cashIn: number; previousCashIn: number;
  cashOut: number; previousCashOut: number; netCash: number;
  receivable: number; payable: number;
  stockValue: number; lowStockItems: number;
  productionRaw: number; productionOutput: number; productionWastage: number;
  customers: number; suppliers: number; activeItems: number;
}
export interface DashboardTrendPoint {
  date: string; sales: number; purchases: number; cashIn: number; cashOut: number; stockIn: number; stockOut: number;
}
export interface DashboardItemSale {
  itemId: number; itemName: string; categoryName: string; unitOfMeasure: string;
  quantity: number; amount: number; returnedQuantity: number; previousAmount: number; currentStock: number;
}
export interface DashboardVoucher {
  voucherNo: string; voucherDate: string; voucherType: string; paymentMode: string; partyName: string; amount: number;
}
export interface DashboardPartyBalance { partyId: number; name: string; periodDebit: number; periodCredit: number; balance: number; }
export interface DashboardStockItem { itemName: string; unitOfMeasure: string; currentStock: number; reorderLevel: number; stockValue: number; }
export interface DashboardAnalytics {
  from: string; to: string; previousFrom: string; previousTo: string;
  granularity: 'day' | 'month';
  kpis: DashboardKpis;
  trend: DashboardTrendPoint[];
  items: DashboardItemSale[];
  categories: NamedAmount[];
  topCustomers: RankedAmount[];
  topSuppliers: RankedAmount[];
  topBookers: RankedAmount[];
  cashInSources: NamedAmount[];
  cashOutUses: NamedAmount[];
  paymentModes: NamedAmount[];
  recentVouchers: DashboardVoucher[];
  customerLedger: { debit: number; credit: number };
  supplierLedger: { debit: number; credit: number };
  topReceivables: DashboardPartyBalance[];
  topPayables: DashboardPartyBalance[];
  lowStock: DashboardStockItem[];
  topStockValue: DashboardStockItem[];
}
