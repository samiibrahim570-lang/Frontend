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
  invoiceIds: number[];
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
}
export interface PurchaseReportItem {
  invoiceDate: string;
  invoiceNo: string;
  supplierName: string;
  netAmount: number;
  paidAmount: number;
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
