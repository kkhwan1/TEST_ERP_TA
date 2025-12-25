# CLAUDE.md

Metal-Flow-ERP - 금속 제조 ERP 시스템 (프레스 → 용접 → 도장)

> **Current State**: 100% Complete (Phase 15) | Supabase PostgreSQL | TanStack Query | Process.md 100% 준수

## Quick Commands

```bash
# Development
npx tsx server/index.ts      # Start dev server (port 5000)

# Build & Check
npm run build                # Build → dist/public
npm run check                # TypeScript check

# Database
npm run db:push              # Push Drizzle schema

# UI Components
npx shadcn@latest add [name] # Add component (new-york style)
```

## Architecture

```
Frontend (React 19 + Vite)
    ↓ TanStack Query hooks
Express.js API (/api/*)
    ↓ Supabase JS Client
Supabase PostgreSQL (UUID keys)
```

### Key Files

| File | Purpose |
|------|---------|
| `client/src/lib/api.ts` | TanStack Query hooks |
| `client/src/lib/types.ts` | Domain types |
| `server/storage.ts` | Business logic + validation |
| `server/routes.ts` | API endpoints (39개) |
| `server/db.ts` | Supabase client |
| `shared/schema.ts` | Drizzle schema |

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

## Domain Model

```typescript
ItemType: RAW | SUB | PRODUCT | SCRAP | CONSUMABLE
ProcessType: PRESS | WELD | PAINT | NONE
TransactionType: PURCHASE_RECEIPT | PRODUCTION_PRESS | PRODUCTION_WELD |
                 PRODUCTION_PAINT | SHIPMENT | SCRAP_SHIPMENT | ADJUSTMENT | TRANSFER

// Manufacturing Flow
RAW → PRESS → WELD → PAINT → PRODUCT → SHIPMENT
            ↘ SCRAP → SCRAP_SHIPMENT
```

## Design Principles (process.md)

| Principle | Implementation |
|-----------|----------------|
| 사람은 "사건"만 입력 | DailyEntry: 날짜, 품목, 수량, 유형 |
| 기초/기말 시스템 산출 | `storage.getInventory()` |
| BOM 월1회 FIX | `/api/bom/fix/:month` |
| 생산 입력 = 결과만 | BOM 자동 차감 + 백엔드 검증 |
| 월말 실사 리셋 | Closing 4단계 프로세스 |

## Backend Core Logic (Phase 14-15)

```typescript
// POST /api/transactions
// 1. Inventory check (negative lines)
validateInventoryAvailability(lines, date)

// 2. BOM auto-deduction (PRODUCTION_WELD/PAINT)
const bom = await getBomByProductAndMonth(itemId, month)
const consumptionLines = generateConsumptionLines(bom, quantity)
// 차감 라인 자동 생성 → 재고 검증 → 저장

// POST /api/snapshots/:month/close
// 1. 조정 트랜잭션 자동 생성
createAdjustmentTransactions(month)
// 2. 스냅샷 CLOSED + 다음 달 기초재고 연결

// getInventory() 동적 이월
// CLOSED 스냅샷 있으면: 실사재고 + 이후 트랜잭션
// 없으면: 전체 트랜잭션 합산
```

Error Codes: `INSUFFICIENT_INVENTORY`, `BOM_NOT_FOUND`

## Critical: Supabase snake_case Convention

**Supabase returns snake_case, TypeScript uses camelCase**. Always handle both:

```typescript
// Reading from Supabase - use snake_case fallback
const itemId = line.item_id || line.itemId;
const differenceQty = lineData.difference_qty || lineData.differenceQty;
const materialId = bomLine.material_id || bomLine.materialId;

// Writing to Supabase - convert camelCase to snake_case
const snakeCaseData: Record<string, any> = {};
for (const [key, value] of Object.entries(camelCaseData)) {
  const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  snakeCaseData[snakeKey] = value;
}
```

**Already converted in**: `createTransaction()`, `updateInventorySnapshot()`, `createAdjustmentTransactions()`, `generateConsumptionLines()`, `getBomByProductAndMonth()`

## Pages (9개 완료)

| Route | Page | Features |
|-------|------|----------|
| `/` | Dashboard | KPI, charts, alerts |
| `/daily-entry` | DailyEntry | 4 tx types, BOM preview, validation |
| `/transactions` | Transactions | Filter, CSV export |
| `/inventory` | Inventory | Stock, ledger, print |
| `/master` | Items | CRUD, duplicate check |
| `/partners` | Partners | VENDOR/CUSTOMER/BOTH |
| `/bom` | BOM | Monthly, fix/lock |
| `/prices` | Prices | Monthly prices, fix |
| `/closing` | Closing | 4-step reconciliation |

## Documentation

| Document | Description |
|----------|-------------|
| `docs/COMPLETED-FEATURES.md` | All completed features (Phase 1-15) |
| `docs/NEXT-STEPS.md` | Future work |
| `docs/API_REFERENCE.md` | API endpoints |
| `docs/SUPABASE-MIGRATION.md` | Supabase guide |
| `docs/plan/process.md` | ERP design philosophy |

## Environment Variables

```bash
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
DATABASE_URL=postgresql://...
PORT=5000
```

**Security**: Never commit `.env`, `SUPABASE_SECRET_KEY` server-side only
