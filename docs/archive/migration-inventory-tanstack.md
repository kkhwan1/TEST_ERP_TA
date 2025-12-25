# Inventory Page Migration to TanStack Query

## Summary

Migrated `client/src/pages/Inventory.tsx` from Context API (`useData()`) to TanStack Query hooks for backend API integration.

## Changes Made

### 1. Import Updates
```typescript
// Before
import { useData } from "@/lib/mock-db";

// After
import { useItems, useInventory, useItemLedger } from "@/lib/api";
import { Loader2 } from "lucide-react";
```

### 2. Main Component State Management

**Before:**
```typescript
const { items, getInventory, getItemLedger } = useData();
const [refreshKey, setRefreshKey] = useState(0);
```

**After:**
```typescript
const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useItems();
const { data: ledgerEntries = [], isLoading: isLoadingLedger } = useItemLedger(
  ledgerItemId ? Number(ledgerItemId) : 0,
  ledgerStartDate,
  ledgerEndDate
);
```

### 3. New Components Created

#### InventoryRow Component
- Fetches individual item inventory using `useInventory(item.id)`
- Displays loading spinner while fetching
- Shows quantity and status badge

#### SelectedItemInventory Component
- Displays current inventory for selected item in ledger tab
- Handles loading state with spinner
- Used in ledger header info card

### 4. ID Type Conversion

Frontend uses string IDs in state, backend expects numbers:
```typescript
// Select component
<SelectItem value={item.id.toString()}>

// API calls
useItemLedger(ledgerItemId ? Number(ledgerItemId) : 0, ...)
```

### 5. Loading States

Added loading indicators throughout:
- Main items table: `isLoadingItems` with spinner row
- Individual inventory: per-row spinners in InventoryRow
- Ledger entries: `isLoadingLedger` with centered spinner
- Selected item inventory: inline spinner

### 6. CSV Export Function

Updated `handleDownloadStock()` to fetch inventory data via API:
```typescript
// Now async with Promise.all for parallel fetching
const data = await Promise.all(
  filteredItems.map(async (item) => {
    const res = await fetch(`/api/inventory/${item.id}`);
    // ...
  })
);
```

**Note:** Added TODO comment for batch optimization when backend supports it.

### 7. Auto-Refetch Behavior

- Removed manual `refreshKey` state
- TanStack Query automatically refetches when dependencies change
- Search button kept for UX but doesn't need manual trigger

## Key Features Preserved

- ✅ Dual tabs (Current Stock / Ledger)
- ✅ Stock filtering by name/code
- ✅ CSV export for both views
- ✅ Print functionality
- ✅ Ledger date range filtering
- ✅ Item selection for ledger view
- ✅ Summary cards (total in/out/balance)
- ✅ Badge status indicators (부족/없음/정상)

## Performance Notes

### Current Implementation
Each item in the current stock table triggers an individual API call via `useInventory(item.id)`. TanStack Query handles caching and deduplication automatically.

### Future Optimization
Consider adding a batch inventory endpoint:
```
GET /api/inventory/batch?itemIds=1,2,3,4,5
```

This would reduce API calls from N (one per item) to 1 for the entire list.

## Testing Checklist

- [ ] Current stock tab loads items
- [ ] Each item shows correct inventory quantity
- [ ] Loading spinners appear during fetch
- [ ] Stock filter works correctly
- [ ] CSV download exports all items with quantities
- [ ] Ledger tab loads correctly
- [ ] Item selection updates ledger
- [ ] Date range filtering works
- [ ] Ledger CSV export works
- [ ] Print button functions
- [ ] Refresh button refetches data
- [ ] Status badges show correct colors
- [ ] Summary cards calculate totals

## Files Modified

- `client/src/pages/Inventory.tsx`

## Dependencies

- `@tanstack/react-query` (already installed)
- `@/lib/api` hooks: `useItems`, `useInventory`, `useItemLedger`
