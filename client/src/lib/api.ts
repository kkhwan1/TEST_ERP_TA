import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Item,
  Partner,
  Transaction,
  MonthlyPrice,
  MonthlyPriceStatus,
  EnhancedInventorySnapshot,
  InventorySnapshotLine,
  LedgerEntry,
  TransactionType,
} from './types';
import type {
  InsertItem,
  InsertPartner,
  InsertBomHeader,
  InsertBomLine,
  InsertTransaction,
  InsertTxLine,
  InsertMonthlyPrice,
  InsertMonthlyPriceStatus,
  InsertInventorySnapshot,
  InsertInventorySnapshotLine,
  BomHeader,
  BomLine,
} from '@shared/schema';

// Query Keys - All IDs are now string (UUID)
export const QUERY_KEYS = {
  items: ['items'] as const,
  item: (id: string) => ['items', id] as const,
  partners: ['partners'] as const,
  partner: (id: string) => ['partners', id] as const,
  bomHeaders: (month?: string) => month ? ['bomHeaders', month] : ['bomHeaders'] as const,
  bomHeader: (id: string) => ['bomHeaders', id] as const,
  transactions: (filter?: TransactionFilter) => filter ? ['transactions', filter] : ['transactions'] as const,
  transaction: (id: string) => ['transactions', id] as const,
  monthlyPrices: (month?: string) => month ? ['monthlyPrices', month] : ['monthlyPrices'] as const,
  monthlyPriceStatus: (month: string) => ['monthlyPriceStatus', month] as const,
  inventory: (itemId: string, date?: string) => ['inventory', itemId, date] as const,
  inventoryBase: ['inventory'] as const,
  itemLedger: (itemId: string, start?: string, end?: string) => ['itemLedger', itemId, start, end] as const,
  itemLedgerBase: ['itemLedger'] as const,
  snapshots: ['snapshots'] as const,
  snapshot: (month: string) => ['snapshots', month] as const,
} as const;

// Filter Types
export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  partnerId?: string;  // UUID
  itemId?: string;  // UUID
}

// API Base URL
const API_BASE = '/api';

// Utility function for API calls
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API call failed: ${res.status}`);
  }

  return res.json();
}

// =============================================================================
// ITEMS
// =============================================================================

export function useItems() {
  return useQuery({
    queryKey: QUERY_KEYS.items,
    queryFn: () => apiCall<Item[]>('/items'),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.item(id),
    queryFn: () => apiCall<Item>(`/items/${id}`),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: InsertItem) =>
      apiCall<Item>('/items', {
        method: 'POST',
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.items });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertItem> }) =>
      apiCall<Item>(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.items });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.item(variables.id) });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<void>(`/items/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.items });
    },
  });
}

// =============================================================================
// PARTNERS
// =============================================================================

export function usePartners() {
  return useQuery({
    queryKey: QUERY_KEYS.partners,
    queryFn: () => apiCall<Partner[]>('/partners'),
  });
}

export function usePartner(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.partner(id),
    queryFn: () => apiCall<Partner>(`/partners/${id}`),
    enabled: !!id,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partner: InsertPartner) =>
      apiCall<Partner>('/partners', {
        method: 'POST',
        body: JSON.stringify(partner),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partners });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertPartner> }) =>
      apiCall<Partner>(`/partners/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partners });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partner(variables.id) });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<void>(`/partners/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partners });
    },
  });
}

// =============================================================================
// BOM (Bill of Materials)
// =============================================================================

export interface BomHeaderWithLines extends BomHeader {
  lines: BomLine[];
}

export function useBomHeaders(month?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.bomHeaders(month),
    queryFn: () => {
      const url = month ? `/bom?month=${month}` : '/bom';
      return apiCall<BomHeaderWithLines[]>(url);
    },
  });
}

export function useBomHeader(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.bomHeader(id),
    queryFn: () => apiCall<BomHeaderWithLines>(`/bom/${id}`),
    enabled: !!id,
  });
}

export function useCreateBomHeader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { header: InsertBomHeader; lines: InsertBomLine[] }) =>
      apiCall<BomHeaderWithLines>('/bom', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bomHeaders() });
    },
  });
}

export function useUpdateBomHeader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { header?: Partial<InsertBomHeader>; lines?: InsertBomLine[] };
    }) =>
      apiCall<BomHeaderWithLines>(`/bom/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bomHeaders() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bomHeader(variables.id) });
    },
  });
}

export function useDeleteBomHeader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<void>(`/bom/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bomHeaders() });
    },
  });
}

export function useFixBom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) =>
      apiCall<{ success: boolean }>(`/bom/fix/${month}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bomHeaders() });
    },
  });
}

// =============================================================================
// TRANSACTIONS
// =============================================================================

export interface TransactionWithLines {
  id: string;
  date: string;
  type: string;
  partner_id?: string | null;
  remarks?: string | null;
  created_at: string;
  lines: Array<{
    id: string;
    transaction_id: string;
    item_id: string;
    quantity: number;
    price?: number | null;
    amount?: number | null;
  }>;
}

export function useTransactions(filter?: TransactionFilter) {
  return useQuery({
    queryKey: QUERY_KEYS.transactions(filter),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter?.startDate) params.set('startDate', filter.startDate);
      if (filter?.endDate) params.set('endDate', filter.endDate);
      if (filter?.type) params.set('type', filter.type);
      if (filter?.partnerId) params.set('partnerId', filter.partnerId.toString());
      if (filter?.itemId) params.set('itemId', filter.itemId.toString());

      const url = `/transactions${params.toString() ? `?${params}` : ''}`;
      return apiCall<TransactionWithLines[]>(url);
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.transaction(id),
    queryFn: () => apiCall<TransactionWithLines>(`/transactions/${id}`),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      transaction: InsertTransaction;
      lines: InsertTxLine[];
    }) =>
      apiCall<TransactionWithLines>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryBase });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.itemLedgerBase });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<void>(`/transactions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryBase });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.itemLedgerBase });
    },
  });
}

// =============================================================================
// MONTHLY PRICES
// =============================================================================

export function useMonthlyPrices(month?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.monthlyPrices(month),
    queryFn: () => {
      const url = month ? `/monthly-prices?month=${month}` : '/monthly-prices';
      return apiCall<MonthlyPrice[]>(url);
    },
  });
}

export function useCreateMonthlyPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertMonthlyPrice) =>
      apiCall<MonthlyPrice>('/monthly-prices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthlyPrices(data.month) });
    },
  });
}

export function useUpdateMonthlyPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertMonthlyPrice> }) =>
      apiCall<MonthlyPrice>(`/monthly-prices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthlyPrices(result.month) });
    },
  });
}

export function useDeleteMonthlyPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<{ month: string }>(`/monthly-prices/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthlyPrices(data.month) });
    },
  });
}

export function useFixMonthlyPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) =>
      apiCall<MonthlyPriceStatus>(`/monthly-prices/fix/${month}`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthlyPrices(data.month) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthlyPriceStatus(data.month) });
    },
  });
}

export function useMonthlyPriceStatus(month: string) {
  return useQuery({
    queryKey: QUERY_KEYS.monthlyPriceStatus(month),
    queryFn: () => apiCall<MonthlyPriceStatus>(`/monthly-prices/status/${month}`),
    enabled: !!month,
  });
}

// =============================================================================
// INVENTORY
// =============================================================================

export interface InventoryResult {
  itemId: string;  // UUID
  quantity: number;
  date: string;
}

export function useInventory(itemId: string, date?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.inventory(itemId, date),
    queryFn: () => {
      const url = date
        ? `/inventory/${itemId}?date=${date}`
        : `/inventory/${itemId}`;
      return apiCall<InventoryResult>(url);
    },
    enabled: !!itemId,
  });
}

export function useItemLedger(itemId: string, start?: string, end?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.itemLedger(itemId, start, end),
    queryFn: () => {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);

      const url = `/inventory/${itemId}/ledger${params.toString() ? `?${params}` : ''}`;
      return apiCall<LedgerEntry[]>(url);
    },
    enabled: !!itemId,
  });
}

// =============================================================================
// INVENTORY SNAPSHOTS (Closing)
// =============================================================================

export function useSnapshots() {
  return useQuery({
    queryKey: QUERY_KEYS.snapshots,
    queryFn: () => apiCall<EnhancedInventorySnapshot[]>('/snapshots'),
  });
}

export function useSnapshot(month: string) {
  return useQuery({
    queryKey: QUERY_KEYS.snapshot(month),
    queryFn: () => apiCall<EnhancedInventorySnapshot>(`/snapshots/${month}`),
    enabled: !!month,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) =>
      apiCall<EnhancedInventorySnapshot>('/snapshots', {
        method: 'POST',
        body: JSON.stringify({ month }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.snapshots });
    },
  });
}

export function useUpdateSnapshotLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertInventorySnapshotLine> }) =>
      apiCall<InventorySnapshotLine>(`/snapshot-lines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.snapshots });
    },
  });
}

export function useCloseMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) =>
      apiCall<EnhancedInventorySnapshot>(`/snapshots/${month}/close`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.snapshots });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryBase });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.itemLedgerBase });
    },
  });
}
