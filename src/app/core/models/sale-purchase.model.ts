export interface SaleDetailLine {
  itemId: number;
  quantity: number;
  rate: number;
  discountAmount: number;
}

export interface CreateSaleRequest {
  invoiceNo?: string | null;
  invoiceDate: string;
  customerId: number;
  bookerId?: number | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  discountAmount: number;
  taxAmount: number;
  paidAmount: number;
  remarks?: string | null;
  items: SaleDetailLine[];
}

export interface SaleDetailResponse {
  itemId: number;
  itemName: string;
  unitOfMeasure: string;
  quantity: number;
  rate: number;
  discountAmount: number;
  totalAmount: number;
}

export interface SaleResponse {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  customerName: string;
  bookerName: string | null;
  driverName: string | null;
  vehicleNumber: string | null;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  remarks: string | null;
  items: SaleDetailResponse[];
}

export interface PurchaseDetailLine {
  itemId: number;
  quantity: number;
  rate: number;
  discountAmount: number;
}

export interface CreatePurchaseRequest {
  invoiceNo?: string | null;
  invoiceDate: string;
  supplierId: number;
  driverName?: string | null;
  vehicleNumber?: string | null;
  discountAmount: number;
  taxAmount: number;
  paidAmount: number;
  remarks?: string | null;
  items: PurchaseDetailLine[];
}

export interface PurchaseDetailResponse {
  itemId: number;
  itemName: string;
  unitOfMeasure: string;
  quantity: number;
  rate: number;
  discountAmount: number;
  totalAmount: number;
}

export interface PurchaseResponse {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  supplierId: number;
  supplierName: string;
  driverName: string | null;
  vehicleNumber: string | null;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  remarks: string | null;
  items: PurchaseDetailResponse[];
}
