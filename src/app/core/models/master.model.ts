export interface Category {
  id: number;
  categoryName: string;
  description: string | null;
}

export interface Item {
  id: number;
  itemCode: string;
  itemName: string;
  categoryId: number;
  categoryName?: string;
  unitOfMeasure: string;
  isRawMaterial: boolean;
  isFinishedGood: boolean;
  openingStock: number;
  currentStock: number;
  purchasePrice: number;
  salePrice: number;
  reorderLevel: number;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  cnic: string | null;
  openingBalance: number;
  currentBalance: number;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  openingBalance: number;
  currentBalance: number;
}

export interface Booker {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  commissionPercent: number;
}
