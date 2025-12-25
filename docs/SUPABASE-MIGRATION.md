# Supabase 마이그레이션 가이드

Metal-Flow-ERP의 Supabase PostgreSQL 데이터베이스 마이그레이션 문서

## 개요

### 마이그레이션 목적
- **이전 구조**: `client/src/lib/mock-db.tsx` (인메모리 상태 관리)
- **현재 구조**: Supabase PostgreSQL (클라우드 데이터베이스)
- **연결 방식**: Supabase JS Client (REST API)

### Supabase 프로젝트 정보
- **Project ID**: `zrubafwvtjnrzgupqqwk`
- **Project URL**: `https://zrubafwvtjnrzgupqqwk.supabase.co`
- **리전**: 자동 할당
- **접근 방식**: REST API (Direct PostgreSQL 연결 아님)

## 데이터베이스 스키마

### 테이블 구조 (총 10개 테이블)

#### 1. items (품목 마스터)
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('RAW', 'SUB', 'PRODUCT', 'SCRAP', 'CONSUMABLE')),
  spec TEXT,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. partners (거래처 마스터)
```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('VENDOR', 'CUSTOMER', 'BOTH')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. bom_headers (BOM 헤더)
```sql
CREATE TABLE bom_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id),
  process_type TEXT NOT NULL CHECK (process_type IN ('PRESS', 'WELD', 'PAINT', 'NONE')),
  is_fixed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_month, item_id, process_type)
);
```

#### 4. bom_lines (BOM 라인)
```sql
CREATE TABLE bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_header_id UUID NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. transactions (거래 헤더)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_date DATE NOT NULL,
  year_month TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PURCHASE_RECEIPT', 'PRODUCTION_PRESS', 'PRODUCTION_WELD', 'PRODUCTION_PAINT', 'SHIPMENT', 'SCRAP_SHIPMENT', 'ADJUSTMENT', 'TRANSFER')),
  partner_id UUID REFERENCES partners(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,4) NOT NULL,
  unit_price DECIMAL(15,2),
  amount DECIMAL(15,2),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. tx_lines (거래 라인 - 생산 투입 자재)
```sql
CREATE TABLE tx_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,4) NOT NULL,
  unit_price DECIMAL(15,2),
  amount DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. monthly_prices (월별 단가)
```sql
CREATE TABLE monthly_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id),
  purchase_price DECIMAL(15,2),
  sales_price DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_month, item_id)
);
```

#### 8. monthly_price_status (월별 단가 확정 상태)
```sql
CREATE TABLE monthly_price_status (
  year_month TEXT PRIMARY KEY,
  is_fixed BOOLEAN DEFAULT false,
  fixed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 9. inventory_snapshots (재고 스냅샷 헤더)
```sql
CREATE TABLE inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'confirmed')),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_month)
);
```

#### 10. inventory_snapshot_lines (재고 스냅샷 라인)
```sql
CREATE TABLE inventory_snapshot_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES inventory_snapshots(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  system_qty DECIMAL(15,4) NOT NULL,
  physical_qty DECIMAL(15,4),
  difference DECIMAL(15,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_id, item_id)
);
```

### 인덱스
```sql
-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_transactions_date ON transactions(tx_date);
CREATE INDEX idx_transactions_year_month ON transactions(year_month);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_bom_headers_year_month ON bom_headers(year_month);
CREATE INDEX idx_monthly_prices_year_month ON monthly_prices(year_month);
```

## UUID 마이그레이션

### 변경 사항
- **이전**: `number` 타입 ID (1, 2, 3...)
- **현재**: `string` 타입 UUID (`'550e8400-e29b-41d4-a716-446655440000'`)

### 영향을 받는 필드
| 테이블 | 필드 | 타입 변경 |
|--------|------|-----------|
| items | id, created_at, updated_at | number → string (UUID, ISO timestamp) |
| partners | id, created_at, updated_at | number → string (UUID, ISO timestamp) |
| bom_headers | id, item_id, created_at, updated_at | number → string |
| bom_lines | id, bom_header_id, material_id | number → string |
| transactions | id, partner_id, item_id, created_at, updated_at | number → string |
| tx_lines | id, transaction_id, material_id | number → string |
| monthly_prices | id, item_id, created_at, updated_at | number → string |
| inventory_snapshots | id, created_at, updated_at, confirmed_at | number → string (timestamps) |
| inventory_snapshot_lines | id, snapshot_id, item_id | number → string |

### 코드 변경 필요 사항
```typescript
// 이전
const itemId: number = 1;

// 현재
const itemId: string = '550e8400-e29b-41d4-a716-446655440000';
```

## 연결 방식

### Supabase JS Client (REST API)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// CRUD 예시
const { data, error } = await supabase
  .from('items')
  .select('*')
  .eq('type', 'RAW');
```

### Direct PostgreSQL 연결 미사용 이유
1. **DNS 에러**: Windows 환경에서 `getaddrinfo ENOTFOUND` 발생
2. **보안**: Supabase는 REST API 우선 설계
3. **간편성**: JS Client가 자동으로 RLS(Row Level Security) 처리
4. **성능**: Edge Function과 통합 용이

## 환경 변수

### 필수 환경 변수 (.env)
```bash
# Supabase 설정
SUPABASE_URL=https://zrubafwvtjnrzgupqqwk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 기존 DATABASE_URL은 사용하지 않음 (Direct PostgreSQL 연결 미사용)
# DATABASE_URL=postgresql://... (제거 가능)

# 서버 포트
PORT=5000
```

### 환경 변수 획득 방법
1. Supabase Dashboard → Project Settings → API
2. **Project URL** → `SUPABASE_URL`
3. **anon public** key → `SUPABASE_ANON_KEY`

## 변경된 파일

### 1. server/db.ts - Supabase Client 설정
```typescript
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

**주요 변경점**:
- `drizzle` 대신 `@supabase/supabase-js` 사용
- PostgreSQL 직접 연결 제거
- REST API 기반 클라이언트 생성

### 2. server/storage.ts - SupabaseStorage 클래스
```typescript
export class SupabaseStorage implements IStorage {
  async getItems(): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('code');

    if (error) throw error;

    // snake_case → camelCase 변환
    return data.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type as ItemType,
      spec: row.spec,
      unit: row.unit,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // ... 나머지 CRUD 메서드
}
```

**주요 변경점**:
- `IStorage` 인터페이스 구현
- snake_case ↔ camelCase 변환 레이어
- Supabase 에러 처리

### 3. server/routes.ts - Transaction with Lines
```typescript
app.post("/api/transactions", async (req, res) => {
  const { lines, ...txData } = req.body;

  // 1. 거래 헤더 삽입
  const tx = await storage.createTransaction(txData);

  // 2. 거래 라인 삽입 (생산 거래인 경우)
  if (lines && lines.length > 0) {
    for (const line of lines) {
      await storage.createTxLine({
        transactionId: tx.id,
        materialId: line.materialId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount
      });
    }
  }

  res.json(tx);
});
```

**주요 변경점**:
- 거래 + 라인 트랜잭션 처리
- `tx_lines` 테이블 활용

### 4. client/src/lib/api.ts - snake_case Types
```typescript
// DB 응답 타입 (snake_case)
interface ItemRow {
  id: string;
  code: string;
  name: string;
  type: string;
  spec: string | null;
  unit: string;
  created_at: string;
  updated_at: string;
}

// 변환 함수
function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type as ItemType,
    spec: row.spec || undefined,
    unit: row.unit,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch('/api/items');
  const rows: ItemRow[] = await res.json();
  return rows.map(toItem);
}
```

**주요 변경점**:
- snake_case → camelCase 변환 레이어
- UUID 타입 (`string`) 사용

### 5. client/src/pages/Dashboard.tsx - Hooks Order Fix
```typescript
function Dashboard() {
  const navigate = useNavigate();

  // React Query hooks를 최상단에 배치 (조건문 밖)
  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems
  });

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: fetchPartners
  });

  // ... 나머지 hooks

  // 로딩/에러 처리는 hooks 호출 이후
  if (itemsQuery.isLoading || partnersQuery.isLoading) {
    return <div>Loading...</div>;
  }

  // ...
}
```

**주요 변경점**:
- React hooks 순서 위반 해결
- 모든 hooks를 조건문 밖으로 이동

### 6. client/src/pages/Transactions.tsx - snake_case Fields
```typescript
// 필터링 시 DB 필드명 사용
const filtered = allTransactions.filter(tx => {
  if (filters.yearMonth && tx.yearMonth !== filters.yearMonth) return false;
  if (filters.type && tx.type !== filters.type) return false;
  // ...
});

// CSV 내보내기 시 한글 헤더 유지, 데이터만 snake_case 변환
const csvData = filtered.map(tx => ({
  '일자': tx.txDate,
  '유형': TX_TYPE_LABELS[tx.type],
  // ...
}));
```

**주요 변경점**:
- `tx_date` → `txDate` (camelCase 사용)
- `year_month` → `yearMonth`

## 테스트 데이터

### 추가된 초기 데이터
```typescript
// 1. 품목 10개 (RAW 4, SUB 3, PRODUCT 2, SCRAP 1)
items: [
  { code: 'R001', name: '강판 1.2T', type: 'RAW', unit: 'KG' },
  { code: 'R002', name: '강판 1.6T', type: 'RAW', unit: 'KG' },
  { code: 'R003', name: '용접봉', type: 'RAW', unit: 'KG' },
  { code: 'R004', name: '도료', type: 'RAW', unit: 'L' },
  { code: 'S001', name: '프레스품A', type: 'SUB', unit: 'EA' },
  { code: 'S002', name: '프레스품B', type: 'SUB', unit: 'EA' },
  { code: 'S003', name: '용접품A', type: 'SUB', unit: 'EA' },
  { code: 'P001', name: '완제품A', type: 'PRODUCT', unit: 'EA' },
  { code: 'P002', name: '완제품B', type: 'PRODUCT', unit: 'EA' },
  { code: 'SC001', name: '스크랩', type: 'SCRAP', unit: 'KG' }
]

// 2. 거래처 4개 (VENDOR 2, CUSTOMER 1, BOTH 1)
partners: [
  { code: 'V001', name: '자재공급사A', type: 'VENDOR' },
  { code: 'V002', name: '자재공급사B', type: 'VENDOR' },
  { code: 'C001', name: '고객사A', type: 'CUSTOMER' },
  { code: 'B001', name: '복합거래처', type: 'BOTH' }
]

// 3. BOM 4개 (각 공정별)
bom_headers: [
  { year_month: '2025-12', item_id: S001, process_type: 'PRESS' },
  { year_month: '2025-12', item_id: S002, process_type: 'PRESS' },
  { year_month: '2025-12', item_id: S003, process_type: 'WELD' },
  { year_month: '2025-12', item_id: P001, process_type: 'PAINT' }
]

// 4. 거래 1건 (입고)
transactions: [
  {
    tx_date: '2025-12-25',
    year_month: '2025-12',
    type: 'PURCHASE_RECEIPT',
    partner_id: V001,
    item_id: R001,
    quantity: 1000,
    unit_price: 5000,
    amount: 5000000
  }
]
```

## 주요 이슈 및 해결 방법

### 1. DNS 에러 (getaddrinfo ENOTFOUND)
**증상**:
```
Error: getaddrinfo ENOTFOUND db.zrubafwvtjnrzgupqqwk.supabase.co
```

**원인**:
- Windows 환경에서 PostgreSQL Direct 연결 시 DNS 해석 실패
- Supabase는 REST API 우선 설계

**해결**:
```typescript
// ❌ 사용하지 않음
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// ✅ 사용
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);
```

### 2. React Hooks 순서 위반
**증상**:
```
Error: Rendered more hooks than during the previous render
```

**원인**:
```typescript
// ❌ 조건문 안에서 hooks 호출
if (condition) {
  const query = useQuery(...);
}
```

**해결**:
```typescript
// ✅ 최상단에서 모든 hooks 호출
const query = useQuery(...);

if (condition) {
  // hooks 결과 사용
}
```

### 3. snake_case ↔ camelCase 불일치
**증상**:
- DB: `created_at`, 코드: `createdAt` 불일치로 undefined 발생

**해결**:
```typescript
// server/storage.ts - 변환 레이어 추가
return data.map(row => ({
  id: row.id,
  createdAt: row.created_at,  // snake_case → camelCase
  updatedAt: row.updated_at
}));
```

### 4. UUID 타입 에러
**증상**:
```typescript
// ❌ number 타입으로 처리
const id: number = 1;

// Type Error: string is not assignable to number
```

**해결**:
```typescript
// ✅ UUID string 타입 사용
const id: string = '550e8400-e29b-41d4-a716-446655440000';
```

### 5. Transaction + Lines 저장 실패
**증상**:
- 거래 헤더는 저장되지만 라인은 저장 안 됨

**해결**:
```typescript
// server/routes.ts
const { lines, ...txData } = req.body;

// 1. 헤더 저장
const tx = await storage.createTransaction(txData);

// 2. 라인 저장 (헤더 ID 필요)
for (const line of lines) {
  await storage.createTxLine({
    transactionId: tx.id,  // 헤더 ID 참조
    ...line
  });
}
```

## 다음 단계

### 완료된 작업
- [x] Supabase 프로젝트 생성
- [x] 10개 테이블 스키마 정의
- [x] Supabase JS Client 연결
- [x] SupabaseStorage 클래스 구현
- [x] 거래 + 라인 API 구현
- [x] 테스트 데이터 추가

### 진행 중
- [ ] 모든 페이지의 API 연결 완료
- [ ] BOM 자동 투입 로직 백엔드 구현
- [ ] 재고 계산 로직 백엔드 구현
- [ ] 마감 프로세스 백엔드 구현

### 향후 계획
- [ ] RLS(Row Level Security) 정책 추가
- [ ] 사용자 인증 연동
- [ ] 실시간 구독(Realtime) 활용
- [ ] Edge Function 활용 (복잡한 계산 로직)

## 참고 자료

- [Supabase JS Client 문서](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Database 문서](https://supabase.com/docs/guides/database)
- [PostgreSQL UUID 타입](https://www.postgresql.org/docs/current/datatype-uuid.html)
