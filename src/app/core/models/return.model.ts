export type ReturnKind = 'sale' | 'purchase';

export interface ReturnableLine {
  detailId: number;
  itemId: number;
  itemName: string;
  unitOfMeasure: string;
  invoicedQty: number;
  returnedQty: number;
  returnableQty: number;
  rate: number;
}

export interface ReturnableInvoice {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  partyId: number;
  partyName: string;
  netAmount: number;
  lines: ReturnableLine[];
}

export interface ReturnLine {
  detailId: number;
  itemId: number;
  itemName: string;
  unitOfMeasure: string;
  quantity: number;
  rate: number;
  totalAmount: number;
}

/** Sale and purchase returns share one shape on the client (party/invoice fields normalised). */
export interface ReturnDoc {
  id: number;
  returnNo: string;
  returnDate: string;
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  partyId: number;
  partyName: string;
  totalAmount: number;
  deductionAmount: number;
  netAmount: number;
  refundAmount: number;
  balanceAmount: number;
  status: string;
  remarks: string | null;
  createdBy: string | null;
  items: ReturnLine[];
}

export interface CreateReturnRequest {
  returnNo: string | null;
  returnDate: string;
  invoiceId: number;
  deductionAmount: number;
  refundAmount: number;
  remarks: string | null;
  items: { detailId: number; quantity: number }[];
}

/** Labels/keys that differ between Sale Return and Purchase Return. */
export interface ReturnConfig {
  kind: ReturnKind;
  title: string;
  menuKey: 'SALERETURN' | 'PURCHASERETURN';
  partyLabel: 'Customer' | 'Supplier';
  invoiceLabel: string;
  refundLabel: string;
  stockNote: string;
}

export const RETURN_CONFIG: Record<ReturnKind, ReturnConfig> = {
  sale: {
    kind: 'sale',
    title: 'Sale Return',
    menuKey: 'SALERETURN',
    partyLabel: 'Customer',
    invoiceLabel: 'Sale Invoice',
    refundLabel: 'Cash refunded to customer',
    stockNote: 'Returned goods are added back to stock and the customer balance is reduced.'
  },
  purchase: {
    kind: 'purchase',
    title: 'Purchase Return',
    menuKey: 'PURCHASERETURN',
    partyLabel: 'Supplier',
    invoiceLabel: 'Purchase Invoice',
    refundLabel: 'Cash refunded by supplier',
    stockNote: 'Returned goods are taken out of stock and the supplier balance is reduced.'
  }
};
