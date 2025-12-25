
export type ItemType = 'RAW' | 'SUB' | 'PRODUCT' | 'SCRAP' | 'CONSUMABLE';
export type ProcessType = 'PRESS' | 'WELD' | 'PAINT' | 'NONE';

export interface Item {
  id: string;  // UUID
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
  id: string;  // UUID
  name: string;
  type: 'VENDOR' | 'CUSTOMER' | 'BOTH';
  registrationNumber?: string;
  contact?: string;
}

export interface BomLine {
  id: string;  // UUID
  materialId: string;  // UUID
  quantity: number; // Quantity required per 1 unit of parent
  process?: ProcessType; // Which process step uses this?
}

export interface BomHeader {
  id: string;  // UUID
  itemId: string;  // UUID
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
  id: string;  // UUID
  itemId: string;  // UUID
  quantity: number; // Positive for IN/Produced, Negative for OUT/Consumed (logic handles sign usually, but let's say quantity is always positive and direction is determined by TxType + Context)
  price?: number;
  amount?: number;
}

export interface Transaction {
  id: string;  // UUID
  date: string; // YYYY-MM-DD
  type: TransactionType;
  partnerId?: string; // UUID - Vendor or Customer
  remarks?: string;
  lines: TxLine[];
  createdAt: string;
}

export interface InventorySnapshot {
  month: string; // YYYY-MM
  items: Record<string, number>; // itemId (UUID) -> quantity
  isClosed: boolean;
}

// Phase 3: Monthly Price Management
export interface MonthlyPrice {
  id: string;  // UUID
  month: string; // YYYY-MM
  itemId: string;  // UUID
  price: number; // Unit price
  type: 'PURCHASE' | 'SALES';
}

export interface MonthlyPriceStatus {
  month: string;
  isFixed: boolean;
  fixedAt?: string;
}

// Phase 4: Closing - Enhanced Inventory Snapshot
export interface InventorySnapshotLine {
  id: string;  // UUID
  snapshotId: string;  // UUID
  itemId: string;  // UUID
  calculatedQty: number;
  actualQty: number;
  differenceQty: number;
  differenceReason?: string;
}

export interface EnhancedInventorySnapshot {
  id: string;  // UUID
  month: string;
  status: 'DRAFT' | 'COUNTING' | 'VARIANCE' | 'CLOSED';
  createdAt: string;
  closedAt?: string;
  adjustmentTxId?: string;  // UUID
  lines: InventorySnapshotLine[];
}

// Phase 9: 수불부 (Inventory Ledger) 타입
export interface LedgerEntry {
  date: string;
  type: TransactionType | 'OPENING_BALANCE';
  typeName: string;        // 한글 거래유형명
  partnerName?: string;    // 거래처명
  inQty: number;           // 입고수량
  outQty: number;          // 출고수량
  balance: number;         // 잔고
  remarks?: string;
  transactionId?: string;  // UUID
}

// 거래유형 한글 라벨
export const TRANSACTION_TYPE_LABELS: Record<TransactionType | 'OPENING_BALANCE', string> = {
  OPENING_BALANCE: '기초재고',
  PURCHASE_RECEIPT: '구매입고',
  PRODUCTION_PRESS: '프레스생산',
  PRODUCTION_WELD: '용접생산',
  PRODUCTION_PAINT: '도장생산',
  SHIPMENT: '제품출고',
  SCRAP_SHIPMENT: '스크랩반출',
  ADJUSTMENT: '재고조정',
  TRANSFER: '이동',
};
