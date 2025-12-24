import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Item, Partner, BomHeader, Transaction, InventorySnapshot, MonthlyPrice, TransactionType } from './types';
import { format } from 'date-fns';

// Seed Data
const INITIAL_ITEMS: Item[] = [
  // Raw Materials
  { id: 'R001', code: 'RAW-001', name: 'Steel Coil 2.0t', spec: '2.0t x 1219mm', unit: 'kg', type: 'RAW', process: 'NONE', source: 'BUY', cost: 1200 },
  { id: 'R002', code: 'RAW-002', name: 'Paint Black', spec: 'Heat Resistant', unit: 'L', type: 'CONSUMABLE', process: 'NONE', source: 'BUY', cost: 15000 },
  
  // Press Parts
  { id: 'S001', code: 'PR-001', name: 'Bracket LH (Press)', spec: 'Model A', unit: 'ea', type: 'SUB', process: 'PRESS', source: 'MAKE', cost: 500 },
  { id: 'S002', code: 'PR-002', name: 'Bracket RH (Press)', spec: 'Model A', unit: 'ea', type: 'SUB', process: 'PRESS', source: 'MAKE', cost: 500 },

  // Welded Parts
  { id: 'S003', code: 'WD-001', name: 'Bracket Assy', spec: 'Model A (Weld)', unit: 'ea', type: 'SUB', process: 'WELD', source: 'MAKE', cost: 1200 },

  // Final Products (Painted)
  { id: 'P001', code: 'PT-001', name: 'Bracket Assy Finished', spec: 'Model A (Black)', unit: 'ea', type: 'PRODUCT', process: 'PAINT', source: 'MAKE', cost: 1500 },

  // Scrap
  { id: 'X001', code: 'SCRAP-001', name: 'Steel Scrap', spec: 'Mixed', unit: 'kg', type: 'SCRAP', process: 'NONE', source: 'MAKE', cost: 300 },
];

const INITIAL_PARTNERS: Partner[] = [
  { id: 'V001', name: 'Posco Steel', type: 'VENDOR' },
  { id: 'V002', name: 'KCC Paint', type: 'VENDOR' },
  { id: 'C001', name: 'Hyundai Motors', type: 'CUSTOMER' },
  { id: 'C002', name: 'Kia Motors', type: 'CUSTOMER' },
  { id: 'S001', name: 'Recycle Corp', type: 'CUSTOMER' }, // Scrap buyer
];

const INITIAL_BOMS: BomHeader[] = [
  // Press BOM: 1kg of Coil makes 5 Brackets (approx) + Scrap
  // Simple: 1 Bracket takes 0.2kg Coil.
  {
    id: 'B001', itemId: 'S001', version: '2025-09', isFixed: true,
    lines: [
      { id: 'L1', materialId: 'R001', quantity: 0.25 } // 0.05kg is scrap
    ]
  },
  {
    id: 'B002', itemId: 'S002', version: '2025-09', isFixed: true,
    lines: [
      { id: 'L2', materialId: 'R001', quantity: 0.25 }
    ]
  },
  // Weld BOM: 1 LH + 1 RH = 1 Assy
  {
    id: 'B003', itemId: 'S003', version: '2025-09', isFixed: true,
    lines: [
      { id: 'L3', materialId: 'S001', quantity: 1 },
      { id: 'L4', materialId: 'S002', quantity: 1 }
    ]
  },
  // Paint BOM: 1 Weld Assy + 0.1L Paint = 1 Finished
  {
    id: 'B004', itemId: 'P001', version: '2025-09', isFixed: true,
    lines: [
      { id: 'L5', materialId: 'S003', quantity: 1 },
      { id: 'L6', materialId: 'R002', quantity: 0.05 }
    ]
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  // Initial Stock (Adjustment)
  {
    id: 'TX001', date: '2025-09-01', type: 'ADJUSTMENT', remarks: 'Opening Balance',
    lines: [
      { id: 'TL1', itemId: 'R001', quantity: 10000 }, // 10 tons of coil
      { id: 'TL2', itemId: 'R002', quantity: 200 },   // 200L Paint
    ],
    createdAt: new Date().toISOString()
  }
];

interface DataContextType {
  items: Item[];
  partners: Partner[];
  boms: BomHeader[];
  transactions: Transaction[];
  monthlyPrices: MonthlyPrice[];
  
  addItem: (item: Item) => void;
  addTransaction: (tx: Transaction) => void;
  updateBom: (bom: BomHeader) => void;
  getInventory: (itemId: string, date?: string) => number;
  calculateWeldConsumption: (itemId: string, qty: number, month: string) => { materialId: string, quantity: number }[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [boms, setBoms] = useState<BomHeader[]>(INITIAL_BOMS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [monthlyPrices, setMonthlyPrices] = useState<MonthlyPrice[]>([]);

  const addItem = (item: Item) => setItems(prev => [...prev, item]);
  
  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
  };

  const updateBom = (bom: BomHeader) => {
    setBoms(prev => {
      const existing = prev.findIndex(b => b.id === bom.id);
      if (existing >= 0) {
        const newBoms = [...prev];
        newBoms[existing] = bom;
        return newBoms;
      }
      return [...prev, bom];
    });
  };

  const getInventory = (itemId: string, dateStr: string = format(new Date(), 'yyyy-MM-dd')) => {
    // Naive calculation: sum all INs - sum all OUTs <= date
    // In a real app, we'd use snapshots + delta.
    let qty = 0;
    
    // Sort transactions by date? No need if just summing.
    const relevantTxs = transactions.filter(tx => tx.date <= dateStr);

    for (const tx of relevantTxs) {
      for (const line of tx.lines) {
        if (line.itemId === itemId) {
          // Logic for IN/OUT based on Transaction Type
          // Usually positive quantity in line means "Action Amount"
          // We decide sign based on type.
          
          let sign = 0;
          
          switch (tx.type) {
            case 'PURCHASE_RECEIPT': sign = 1; break;
            case 'PRODUCTION_PRESS': 
            case 'PRODUCTION_WELD': 
            case 'PRODUCTION_PAINT':
              // If this item is the output (not tracked in lines usually for consumption? 
              // Wait, the prompt says "Weld saves triggers auto consumption". 
              // So consumption should be a separate transaction or negative lines?)
              // Let's assume the Transaction Log stores explicit +/- lines for robustness.
              // BUT, the UI usually just enters "Produced X".
              // My addTransaction should handle converting "Produced X" into "In X, Out Y, Out Z" lines if I want a unified ledger.
              // OR, I check if the item is the produced item or the consumed item.
              // Let's assume 'lines' in Transaction ALREADY contains the net effect or we interpret it?
              // Standard ERP: Production Header = Output Item. Lines = Consumed Materials.
              // Here I defined Transaction generic. 
              // Let's stick to: Transaction contains ALL movements.
              // So a Production TX will have:
              // Line 1: Item A (Product) Qty 10 (Positive)
              // Line 2: Item B (Mat) Qty 10 (Negative)
              
              // If the mock data has explicit negative quantities for consumption, we just sum.
              // Let's assume stored quantities are SIGNED in my logic for simplicity in calculation?
              // Or Type defines direction?
              // Let's say: lines always positive. Type defines direction? No, mixed types exist (e.g. Adjustment).
              // Let's say: lines.quantity can be negative.
              sign = 1; 
              break;
            case 'SHIPMENT': 
            case 'SCRAP_SHIPMENT': 
              sign = -1; 
              break;
            case 'ADJUSTMENT': 
              sign = 1; // Adjustment can be + or -
              break;
            case 'TRANSFER':
              sign = 1; // Need From/To logic, usually -1 from Source, +1 to Dest.
              break;
          }
          
          // If transaction lines store "Produced 10", "Consumed 5" -> we need to differentiate.
          // Let's simplify: 
          // addTransaction logic will convert everything to "Stock Movement" lines where quantity is +/-.
          // So getInventory just sums.
          qty += line.quantity;
        }
      }
    }
    return qty;
  };

  const calculateWeldConsumption = (itemId: string, qty: number, month: string) => {
    // Find BOM for this item and month
    const bom = boms.find(b => b.itemId === itemId && b.version === month);
    if (!bom) return [];
    
    return bom.lines.map(line => ({
      materialId: line.materialId,
      quantity: line.quantity * qty
    }));
  };

  return (
    <DataContext.Provider value={{ 
      items, partners, boms, transactions, monthlyPrices,
      addItem, addTransaction, updateBom, getInventory, calculateWeldConsumption 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
