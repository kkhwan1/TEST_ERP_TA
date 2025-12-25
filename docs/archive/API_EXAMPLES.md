# API Usage Examples

## Items

### Create Item
```bash
POST /api/items
Content-Type: application/json

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

### Update Item
```bash
PUT /api/items/1
Content-Type: application/json

{
  "cost": "55000"
}
```

## BOM

### Create BOM with Lines
```bash
POST /api/bom
Content-Type: application/json

{
  "itemId": 10,
  "version": "2025-01",
  "isFixed": false,
  "lines": [
    {
      "materialId": 1,
      "quantity": "2.5",
      "process": "PRESS"
    },
    {
      "materialId": 2,
      "quantity": "1.0",
      "process": "WELD"
    }
  ]
}
```

### Fix BOMs for Month
```bash
POST /api/bom/fix/2025-01
```

## Transactions

### Create Purchase Receipt
```bash
POST /api/transactions
Content-Type: application/json

{
  "date": "2025-01-15",
  "type": "PURCHASE_RECEIPT",
  "partnerId": 5,
  "remarks": "Monthly raw material order",
  "lines": [
    {
      "itemId": 1,
      "quantity": "100",
      "price": "50000",
      "amount": "5000000"
    }
  ]
}
```

### Create Production Transaction
```bash
POST /api/transactions
Content-Type: application/json

{
  "date": "2025-01-20",
  "type": "PRODUCTION_PRESS",
  "remarks": "Press production batch #123",
  "lines": [
    {
      "itemId": 10,
      "quantity": "50",
      "price": null,
      "amount": null
    }
  ]
}
```

### Query Transactions
```bash
# All transactions
GET /api/transactions

# Filter by date range
GET /api/transactions?startDate=2025-01-01&endDate=2025-01-31

# Filter by type
GET /api/transactions?type=PURCHASE_RECEIPT

# Filter by partner
GET /api/transactions?partnerId=5

# Filter by item (searches transaction lines)
GET /api/transactions?itemId=1

# Combined filters
GET /api/transactions?startDate=2025-01-01&endDate=2025-01-31&type=PRODUCTION_PRESS
```

## Monthly Prices

### Create Monthly Price
```bash
POST /api/monthly-prices
Content-Type: application/json

{
  "month": "2025-01",
  "itemId": 1,
  "price": "50000",
  "type": "PURCHASE"
}
```

### Fix Prices for Month
```bash
POST /api/monthly-prices/fix/2025-01
```

### Check Price Status
```bash
GET /api/monthly-prices/status/2025-01
```

Response:
```json
{
  "month": "2025-01",
  "isFixed": true,
  "fixedAt": "2025-01-31T09:00:00.000Z"
}
```

## Inventory

### Get Current Inventory
```bash
# As of today
GET /api/inventory/1

# As of specific date
GET /api/inventory/1?date=2025-01-31
```

Response:
```json
{
  "itemId": 1,
  "quantity": 150,
  "asOfDate": "2025-01-31"
}
```

### Get Inventory Ledger (수불부)
```bash
# All time
GET /api/inventory/1/ledger

# Date range
GET /api/inventory/1/ledger?start=2025-01-01&end=2025-01-31
```

Response:
```json
[
  {
    "date": "2025-01-01",
    "type": "OPENING_BALANCE",
    "typeName": "기초재고",
    "inQty": 0,
    "outQty": 0,
    "balance": 100
  },
  {
    "date": "2025-01-15",
    "type": "PURCHASE_RECEIPT",
    "typeName": "구매입고",
    "partnerName": "ABC Steel Co.",
    "inQty": 100,
    "outQty": 0,
    "balance": 200,
    "remarks": "Monthly raw material order",
    "transactionId": 123
  },
  {
    "date": "2025-01-20",
    "type": "PRODUCTION_PRESS",
    "typeName": "프레스생산",
    "inQty": 0,
    "outQty": 50,
    "balance": 150,
    "remarks": "Press production batch #123",
    "transactionId": 124
  }
]
```

## Snapshots (월마감)

### Create Snapshot
```bash
POST /api/snapshots
Content-Type: application/json

{
  "month": "2025-01",
  "status": "DRAFT",
  "lines": [
    {
      "itemId": 1,
      "calculatedQty": "150.0000",
      "actualQty": null,
      "differenceQty": null
    },
    {
      "itemId": 2,
      "calculatedQty": "200.0000",
      "actualQty": null,
      "differenceQty": null
    }
  ]
}
```

### Update Physical Count
```bash
PUT /api/snapshot-lines/1
Content-Type: application/json

{
  "actualQty": "148.0000",
  "differenceQty": "-2.0000"
}
```

### Close Snapshot
```bash
POST /api/snapshots/2025-01/close
```

## Error Responses

All endpoints return error responses in this format:

```json
{
  "error": "Item not found"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `204` - No Content (successful delete)
- `404` - Not Found
- `500` - Internal Server Error
