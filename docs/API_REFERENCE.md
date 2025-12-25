# API Reference (Supabase Backend)

> 최종 업데이트: 2025-12-25

## Overview

Metal-Flow-ERP REST API with Supabase PostgreSQL backend.

**Key Technologies**:
- Supabase JS Client for database operations
- Express.js REST API server
- PostgreSQL via Supabase
- UUID primary keys, snake_case naming

---

## Items API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List all items |
| GET | `/api/items/:id` | Get single item |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

### Create Item
```bash
POST /api/items
{
  "code": "RAW-001",
  "name": "Steel Plate",
  "spec": "2.0t x 1219",
  "unit": "EA",
  "type": "RAW",
  "process": "NONE",
  "source": "BUY",
  "cost": "50000"
}
```

---

## Partners API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partners` | List all partners |
| GET | `/api/partners/:id` | Get single partner |
| POST | `/api/partners` | Create partner |
| PUT | `/api/partners/:id` | Update partner |
| DELETE | `/api/partners/:id` | Delete partner |

---

## BOM API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bom?month=YYYY-MM` | List BOM headers |
| GET | `/api/bom/:id` | Get BOM with lines |
| POST | `/api/bom` | Create BOM (header + lines) |
| PUT | `/api/bom/:id` | Update BOM (replaces lines) |
| DELETE | `/api/bom/:id` | Delete BOM (cascades) |
| POST | `/api/bom/fix/:month` | Fix BOMs for month |

### Create BOM
```bash
POST /api/bom
{
  "itemId": 10,
  "version": "2025-01",
  "isFixed": false,
  "lines": [
    { "materialId": 1, "quantity": "2.5", "process": "PRESS" },
    { "materialId": 2, "quantity": "1.0", "process": "WELD" }
  ]
}
```

---

## Transactions API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions?startDate&endDate&type&partnerId&itemId` | List transactions |
| GET | `/api/transactions/:id` | Get transaction with lines |
| POST | `/api/transactions` | Create transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

### Create Transaction
```bash
POST /api/transactions
{
  "date": "2025-01-15",
  "type": "PURCHASE_RECEIPT",
  "partnerId": 5,
  "remarks": "Monthly order",
  "lines": [
    { "itemId": 1, "quantity": "100", "price": "50000", "amount": "5000000" }
  ]
}
```

### Query Filters
```bash
GET /api/transactions?startDate=2025-01-01&endDate=2025-01-31
GET /api/transactions?type=PURCHASE_RECEIPT
GET /api/transactions?partnerId=5
GET /api/transactions?itemId=1
```

### Backend Validation (Phase 13)
- **Inventory Check**: Negative quantity lines validated against current stock
- **BOM Validation**: PRODUCTION_WELD/PAINT verified against BOM consumption

Error Codes:
| Code | Description | HTTP |
|------|-------------|------|
| `INSUFFICIENT_INVENTORY` | Not enough stock | 400 |
| `BOM_VALIDATION_FAILED` | BOM mismatch | 400 |

---

## Monthly Prices API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monthly-prices?month=YYYY-MM` | List prices |
| POST | `/api/monthly-prices` | Create price |
| PUT | `/api/monthly-prices/:id` | Update price |
| DELETE | `/api/monthly-prices/:id` | Delete price |
| GET | `/api/monthly-prices/status/:month` | Get fix status |
| POST | `/api/monthly-prices/fix/:month` | Fix prices |

---

## Inventory API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/:itemId?date=YYYY-MM-DD` | Calculate inventory |
| GET | `/api/inventory/:itemId/ledger?start&end` | Generate ledger |

### Ledger Response
```json
[
  { "date": "2025-01-01", "type": "OPENING_BALANCE", "typeName": "기초재고", "balance": 100 },
  { "date": "2025-01-15", "type": "PURCHASE_RECEIPT", "typeName": "구매입고", "inQty": 100, "balance": 200 }
]
```

---

## Snapshots API (월마감)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/snapshots` | List all snapshots |
| GET | `/api/snapshots/:month` | Get snapshot with lines |
| POST | `/api/snapshots` | Create snapshot |
| PUT | `/api/snapshot-lines/:id` | Update physical count |
| POST | `/api/snapshots/:month/close` | Close snapshot |

---

## Business Logic

### Transaction Type Signs
| Type | Sign | Description |
|------|------|-------------|
| PURCHASE_RECEIPT | +1 | Incoming |
| PRODUCTION_PRESS | +1 | Production output |
| PRODUCTION_WELD | +1 | Production output |
| PRODUCTION_PAINT | +1 | Production output |
| SHIPMENT | -1 | Outgoing |
| SCRAP_SHIPMENT | -1 | Outgoing |
| ADJUSTMENT | ±1 | By line quantity |
| TRANSFER | 0 | Neutral |

### Key Features
- **Cascade Deletes**: Parent deletion removes children (Supabase FK)
- **Atomic Operations**: Header + lines created together
- **UUID Primary Keys**: All tables use UUID
- **snake_case Naming**: Database convention

---

## Error Responses

```json
{ "error": "Item not found" }
```

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request (validation) |
| 404 | Not Found |
| 500 | Internal Server Error |
