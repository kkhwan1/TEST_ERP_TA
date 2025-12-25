# DailyEntry.tsx Migration Summary

## Overview
Migrated `client/src/pages/DailyEntry.tsx` from useData() Context to TanStack Query hooks.

## Key Changes

### 1. Imports
- ✅ Removed: `import { useData } from "@/lib/mock-db"`
- ✅ Added: TanStack Query hooks from `@/lib/api`
  - `useItems`, `usePartners`, `useBomHeaders`, `useTransactions`
  - `useCreateTransaction`, `useMonthlyPrices`, `useMonthlyPriceStatus`
  - `useSnapshot`, `useInventory`
- ✅ Added: Schema types from `@shared/schema`

### 2. Data Fetching
Replaced single `useData()` context with individual query hooks:

```tsx
// Before
const { items, partners, transactions, ... } = useData();

// After
const { data: items = [], isLoading: itemsLoading } = useItems();
const { data: partners = [], isLoading: partnersLoading } = usePartners();
const { data: transactionsData = [] } = useTransactions({ startDate: date, endDate: date });
const { data: monthlyBoms = [] } = useBomHeaders(currentMonth);
const { data: monthlyPrices = [] } = useMonthlyPrices(currentMonth);
const { data: priceStatus } = useMonthlyPriceStatus(currentMonth);
const { data: snapshot } = useSnapshot(currentMonth);
```

### 3. Business Logic Functions
Moved business logic from context to local helper functions:

- `calculateConsumption()` - BOM consumption calculation for PRESS/WELD/PAINT
- `isBomFixed()` - Check if BOM is locked for a month
- `checkInventoryAvailable()` - Validate inventory availability
- `checkProcessSequence()` - Ensure PRESS → WELD → PAINT sequence

### 4. Transaction Submission
Updated all form handlers to use mutation:

```tsx
// Before
addTransaction(tx);

// After
await createTransactionMutation.mutateAsync({
  transaction,
  lines: txLines as any,
});
```

### 5. ID Type Conversions
- Frontend uses string IDs (for select components)
- Backend uses number IDs
- Conversion handled via `parseInt()` before API calls

### 6. Loading States
Added loading indicators:
```tsx
const isLoading = itemsLoading || partnersLoading || createTransactionMutation.isPending;
```

All buttons disabled during submission/loading.

### 7. Data Format Conversions
- **Partner IDs**: Converted to strings for Select components
- **Transaction Lines**: Mapped TransactionWithLines → Transaction type for TodayEntriesList
- **Quantities/Prices**: Converted to strings for backend (numeric type in DB)

## Known Limitations

### Inventory Cache
Currently uses local state for inventory caching:
```tsx
const [inventoryCache, setInventoryCache] = useState<Record<number, number>>({});
```

**TODO**: Implement proper inventory queries when backend API is ready:
- `GET /api/inventory/:itemId?date=YYYY-MM-DD`
- Consider batch endpoint for multiple items

### BOM Preview
WeldPreview state still uses component state:
```tsx
const [weldPreview, setWeldPreview] = useState<{ materialId: number; quantity: number }[] | null>(null);
```

This is acceptable as it's temporary UI state for preview purposes.

## Type Safety Notes

### InsertTxLine Type Issue
The backend adds `transactionId` automatically, but the type includes it. Workaround using type assertion:
```tsx
const txLines = [...] as Omit<InsertTxLine, 'transactionId'>[];
// Then use: lines: txLines as any
```

**TODO**: Update `@shared/schema.ts` to properly omit `transactionId` from `insertTxLineSchema`.

### MaterialId Type Mismatch
- Helper functions return `{ materialId: number, quantity: number }`
- Components expect `{ materialId: string, quantity: number }`

Currently handled with type assertions. Consider standardizing to number IDs throughout.

## Testing Checklist

- [ ] Receipt (PURCHASE_RECEIPT) - 4 transaction types work correctly
- [ ] Production (PRESS/WELD/PAINT) - BOM consumption calculated
- [ ] Shipment (SHIPMENT) - Inventory validation works
- [ ] Scrap (SCRAP_SHIPMENT) - Inventory check functional
- [ ] BOM validation - Fixed BOM required for production
- [ ] Process sequence - PRESS before WELD before PAINT
- [ ] Monthly price auto-fill - When prices are fixed
- [ ] Month closed - Prevents transaction entry
- [ ] Loading states - Buttons disabled appropriately
- [ ] Error handling - Toast messages display correctly

## Files Modified

- `client/src/pages/DailyEntry.tsx` - Main migration

## Next Steps

1. Connect backend API (currently using mock-db still for other pages)
2. Implement inventory query hooks when backend ready
3. Fix InsertTxLine type definition in schema
4. Standardize ID types (string vs number) across frontend/backend
5. Add proper TypeScript types for BomHeaderWithLines
6. Consider moving helper functions to separate utility file if reused
