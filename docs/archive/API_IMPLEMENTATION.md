# API Implementation Summary (Supabase Backend)

## Overview
Complete REST API implementation for Metal-Flow-ERP with Supabase as the backend database. The Express server in `server/routes.ts` uses the Supabase JS Client to interact with PostgreSQL, providing type-safe database operations with automatic schema inference.

**Key Technologies**:
- Supabase JS Client for database operations
- Express.js for REST API server
- PostgreSQL (via Supabase)
- UUID primary keys
- snake_case field naming convention (Supabase standard)

## Implemented Endpoints

### Items API
- `GET /api/items` - List all items
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Partners API
- `GET /api/partners` - List all partners
- `GET /api/partners/:id` - Get single partner
- `POST /api/partners` - Create partner
- `PUT /api/partners/:id` - Update partner
- `DELETE /api/partners/:id` - Delete partner

### BOM API
- `GET /api/bom?month=YYYY-MM` - List BOM headers (optional month filter)
- `GET /api/bom/:id` - Get BOM with lines
- `POST /api/bom` - Create BOM (header + lines)
- `PUT /api/bom/:id` - Update BOM (replaces lines)
- `DELETE /api/bom/:id` - Delete BOM (cascades to lines)
- `POST /api/bom/fix/:month` - Fix BOMs for month

### Transactions API
- `GET /api/transactions?startDate&endDate&type&partnerId&itemId` - List transactions (with filters)
- `GET /api/transactions/:id` - Get transaction with lines
- `POST /api/transactions` - Create transaction (header + lines)
- `DELETE /api/transactions/:id` - Delete transaction (cascades to lines)

### Monthly Prices API
- `GET /api/monthly-prices?month=YYYY-MM` - List prices (optional month filter)
- `POST /api/monthly-prices` - Create price
- `PUT /api/monthly-prices/:id` - Update price
- `DELETE /api/monthly-prices/:id` - Delete price
- `GET /api/monthly-prices/status/:month` - Get fix status
- `POST /api/monthly-prices/fix/:month` - Fix prices for month

### Inventory API
- `GET /api/inventory/:itemId?date=YYYY-MM-DD` - Calculate inventory (as of date)
- `GET /api/inventory/:itemId/ledger?start&end` - Generate ledger (수불부)

### Snapshots API (월마감)
- `GET /api/snapshots` - List all snapshots
- `GET /api/snapshots/:month` - Get snapshot with lines
- `POST /api/snapshots` - Create snapshot (header + lines)
- `PUT /api/snapshot-lines/:id` - Update snapshot line
- `POST /api/snapshots/:month/close` - Close snapshot (set status to CLOSED)

## Business Logic Implementation

### Inventory Calculation (`getTransactionSign`)
Transaction type signs for inventory calculation:
- **+1 (Increase)**: PURCHASE_RECEIPT, PRODUCTION_PRESS, PRODUCTION_WELD, PRODUCTION_PAINT
- **-1 (Decrease)**: SHIPMENT, SCRAP_SHIPMENT
- **±1 (Adjustment)**: ADJUSTMENT (sign determined by line quantity)
- **0 (Neutral)**: TRANSFER

### Ledger Generation
The `/api/inventory/:itemId/ledger` endpoint:
1. Calculates opening balance (prior transactions before start date)
2. Processes each transaction line for the item
3. Maintains running balance
4. Includes Korean transaction type names (기초재고, 구매입고, etc.)
5. Fetches partner names for display

### Key Features
- **Cascade Deletes**: Deleting BOM/Transaction/Snapshot automatically removes child lines (enforced by Supabase foreign keys)
- **Atomic Operations**: Header + lines created/updated together using transactions
- **Type Safety**: Supabase provides automatic TypeScript type inference from database schema
- **Error Handling**: Try-catch blocks with descriptive error messages
- **UUID Primary Keys**: All tables use UUID for primary keys (Supabase default)
- **snake_case Naming**: Database fields use snake_case (e.g., `item_code`, `created_at`)

## Data Types and Field Naming

### Supabase Type System
Supabase returns properly typed data from PostgreSQL:
- **Numeric fields**: Returned as JavaScript numbers (not strings like Drizzle)
- **Dates**: Returned as ISO 8601 strings
- **UUIDs**: String format for primary keys and foreign keys
- **Enums**: String literals matching database enum values

### Field Naming Convention
All database fields use **snake_case** (Supabase/PostgreSQL standard):
- `item_code`, `item_name`, `item_type`
- `partner_code`, `partner_name`, `partner_type`
- `transaction_date`, `transaction_type`, `partner_id`
- `created_at`, `updated_at` (timestamps)

Frontend code using camelCase should transform field names when interfacing with the API.

## Testing
Type check passed for server routes:
```bash
npm run check  # No errors in server/routes.ts
```

## Connection Status
Frontend is now connected to the Supabase backend API. The `mock-db.tsx` provider has been replaced with TanStack Query hooks that fetch data from the REST API endpoints.

## Next Steps
1. ✅ ~~Connect frontend to use API instead of mock-db.tsx~~ (COMPLETED)
2. Add authentication middleware (Supabase Auth integration)
3. Add validation middleware (Zod schemas for request validation)
4. Add pagination for large lists (items, transactions, partners)
5. Add transaction logging and audit trail
6. Implement BOM auto-consumption logic in transaction creation
7. Add Row-Level Security (RLS) policies in Supabase
8. Implement real-time subscriptions for live inventory updates (optional)
