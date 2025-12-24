
export type ItemType = 'RAW' | 'SUB' | 'PRODUCT' | 'SCRAP' | 'CONSUMABLE';
export type ProcessType = 'PRESS' | 'WELD' | 'PAINT' | 'NONE';

export interface Item {
  id: string;
  code: string;
  name: string;
  spec: string; // e.g., "2.0t x 1219" or "LH/RH"
  unit: string;
  type: ItemType;
  process: ProcessType; // For products/sub-assemblies, which process produces this?
  source: 'MAKE' | 'BUY'; // Manufactured or Purchased
  cost: number; // Standard cost (optional)
}

export interface Partner {
  id: string;
  name: string;
  type: 'VENDOR' | 'CUSTOMER' | 'BOTH';
  registrationNumber?: string;
  contact?: string;
}

export interface BomLine {
  id: string;
  materialId: string;
  quantity: number; // Quantity required per 1 unit of parent
  process?: ProcessType; // Which process step uses this?
}

export interface BomHeader {
  id: string;
  itemId: string;
  version: string; // "2025-09"
  isFixed: boolean;
  lines: BomLine[];
}

export type TransactionType = 
  | 'PURCHASE_RECEIPT' // Buying Raw/Sub
  | 'PRODUCTION_PRESS' 
  | 'PRODUCTION_WELD' 
  | 'PRODUCTION_PAINT' 
  | 'SHIPMENT'         // Sales
  | 'SCRAP_SHIPMENT'   // Selling Scrap
  | 'ADJUSTMENT'       // Inventory Adjustment
  | 'TRANSFER';        // Warehouse transfer (optional)

export interface TxLine {
  id: string;
  itemId: string;
  quantity: number; // Positive for IN/Produced, Negative for OUT/Consumed (logic handles sign usually, but let's say quantity is always positive and direction is determined by TxType + Context)
  price?: number;
  amount?: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  partnerId?: string; // Vendor or Customer
  remarks?: string;
  lines: TxLine[];
  createdAt: string;
}

export interface InventorySnapshot {
  month: string; // YYYY-MM
  items: Record<string, number>; // itemId -> quantity
  isClosed: boolean;
}

export interface MonthlyPrice {
  id: string;
  month: string; // YYYY-MM
  itemId: string;
  price: number; // Unit price
  type: 'PURCHASE' | 'SALES';
}
