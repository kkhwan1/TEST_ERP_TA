# Phase 14-15 구현 계획

> 작성일: 2025-12-25
> 목표: process.md 설계 원칙 100% 달성
> **상태: ✅ 완료 (2025-12-25)**

---

## 개요

| Phase | 목표 | 상태 |
|-------|------|------|
| 14 | 월마감 완전 구현 | ✅ 완료 |
| 15 | 백엔드 BOM 자동 차감 | ✅ 완료 |

**Process.md 준수율: 70% → 100%**

---

## Phase 14: 월마감 완전 구현

### 14-1. 조정 트랜잭션 자동 생성

**목표**: 마감 시 실사-산출 차이분에 대해 ADJUSTMENT 트랜잭션 자동 생성

**수정 파일**: `server/storage.ts`

```typescript
async createAdjustmentTransactions(month: string): Promise<void> {
  // 1. 해당 월 스냅샷 조회
  const snapshot = await this.getSnapshot(month);
  if (!snapshot || !snapshot.lines) return;

  // 2. 차이가 있는 라인 필터
  const adjustmentLines = snapshot.lines
    .filter(line => line.differenceQty && parseFloat(line.differenceQty) !== 0);

  if (adjustmentLines.length === 0) return;

  // 3. 월말일 계산 (예: 2025-01 → 2025-01-31)
  const lastDay = new Date(month + '-01');
  lastDay.setMonth(lastDay.getMonth() + 1);
  lastDay.setDate(0);
  const adjustmentDate = lastDay.toISOString().split('T')[0];

  // 4. ADJUSTMENT 트랜잭션 생성
  const transaction = {
    date: adjustmentDate,
    type: 'ADJUSTMENT',
    partnerId: null,
    remarks: `${month} 월마감 재고조정`
  };

  // 5. 각 품목별 라인 생성
  const lines = adjustmentLines.map(line => ({
    itemId: line.itemId,
    quantity: line.differenceQty, // +면 증가, -면 감소
    price: null,
    amount: null
  }));

  await this.createTransaction(transaction, lines);
}
```

**체크리스트**:
- [ ] createAdjustmentTransactions() 메서드 추가
- [ ] 월말일 계산 로직
- [ ] 차이분 라인 생성
- [ ] 트랜잭션 저장

---

### 14-2. getInventory() 동적 이월 로직

**목표**: 마감된 월의 실사재고를 기준점으로 재고 계산

**수정 파일**: `server/storage.ts`

```typescript
async getInventory(itemId: string, asOfDate?: string): Promise<number> {
  const date = asOfDate || new Date().toISOString().split('T')[0];
  const currentMonth = date.substring(0, 7);

  // 1. 이전 월 중 CLOSED된 가장 최근 스냅샷 찾기
  const closedSnapshot = await this.getLatestClosedSnapshotLine(itemId, currentMonth);

  if (closedSnapshot) {
    // 2. 마감된 월이 있으면: 실사재고 + 이후 트랜잭션
    const baseQty = parseFloat(closedSnapshot.actualQty || '0');

    // 다음 달 1일부터 조회 날짜까지
    const nextMonth = this.getNextMonth(closedSnapshot.month);
    const startDate = nextMonth + '-01';

    const deltaQty = await this.sumTransactionsInRange(itemId, startDate, date);
    return baseQty + deltaQty;
  } else {
    // 3. 마감된 월 없으면: 전체 트랜잭션 합산 (기존 로직)
    return this.sumAllTransactions(itemId, date);
  }
}

async getLatestClosedSnapshotLine(itemId: string, beforeMonth: string): Promise<SnapshotLine | null> {
  // CLOSED 상태 스냅샷 중 beforeMonth 이전 가장 최근 것
  const { data } = await supabase
    .from('inventory_snapshots')
    .select(`
      month,
      status,
      inventory_snapshot_lines!inner(item_id, actual_qty)
    `)
    .eq('status', 'CLOSED')
    .lt('month', beforeMonth)
    .eq('inventory_snapshot_lines.item_id', itemId)
    .order('month', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    month: data.month,
    actualQty: data.inventory_snapshot_lines[0].actual_qty
  };
}

getNextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const next = new Date(year, mon, 1); // mon is 0-indexed, so this is next month
  return next.toISOString().substring(0, 7);
}
```

**체크리스트**:
- [ ] getLatestClosedSnapshotLine() 메서드 추가
- [ ] getNextMonth() 헬퍼 추가
- [ ] sumTransactionsInRange() 메서드 추가 (또는 기존 로직 재사용)
- [ ] getInventory() 로직 수정

---

### 14-3. closeSnapshot 엔드포인트 수정

**수정 파일**: `server/routes.ts`

```typescript
// 기존 (약 라인 500-520)
app.post('/api/snapshots/:month/close', async (req, res) => {
  const month = req.params.month;

  try {
    // 1. 조정 트랜잭션 생성 (신규)
    await storage.createAdjustmentTransactions(month);

    // 2. 스냅샷 상태 CLOSED로 변경 (기존)
    await storage.closeSnapshot(month);

    res.json({ success: true, message: `${month} 월마감 완료` });
  } catch (error) {
    res.status(500).json({ error: '월마감 실패' });
  }
});
```

**체크리스트**:
- [ ] createAdjustmentTransactions 호출 추가
- [ ] 에러 처리

---

### 14-4. Closing.tsx UI 메시지 개선

**수정 파일**: `client/src/pages/Closing.tsx`

```tsx
// 마감 확인 다이얼로그
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{selectedMonth} 월마감 확정</AlertDialogTitle>
      <AlertDialogDescription className="space-y-2">
        <p>월마감을 확정하시겠습니까?</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground">
          <li>재고 차이분에 대해 조정 트랜잭션이 자동 생성됩니다</li>
          <li>다음 달 재고는 실사재고를 기준으로 계산됩니다</li>
          <li>마감 후에는 해당 월의 데이터를 수정할 수 없습니다</li>
        </ul>
      </AlertDialogDescription>
    </AlertDialogHeader>
    ...
  </AlertDialogContent>
</AlertDialog>
```

**체크리스트**:
- [ ] 마감 확인 메시지 개선
- [ ] 자동 생성 안내 추가

---

## Phase 15: 백엔드 BOM 자동 차감

### 15-1. DailyEntry.tsx 차감 라인 제거

**목표**: 프론트에서 BOM 차감 라인 생성 제거, 생산 라인만 전송

**수정 파일**: `client/src/pages/DailyEntry.tsx`

```typescript
// 기존 (약 라인 478-493)
const txLines = [
  { itemId: prodItemId, quantity: prodQty.toString() },
  ...consumption.map(c => ({
    itemId: c.materialId,
    quantity: (-c.quantity).toString()
  }))
];

// 변경 후
const txLines = [
  { itemId: prodItemId, quantity: prodQty.toString() }
  // 차감 라인은 백엔드에서 자동 생성
];
```

**주의**: MaterialConsumptionAlert 컴포넌트는 유지 (사용자 정보 제공용)

**체크리스트**:
- [ ] PRODUCTION_WELD 핸들러에서 consumption 라인 제거
- [ ] PRODUCTION_PAINT 핸들러에서 consumption 라인 제거
- [ ] MaterialConsumptionAlert 유지 확인

---

### 15-2. routes.ts BOM 자동 차감

**수정 파일**: `server/routes.ts`

```typescript
// POST /api/transactions (약 라인 298-396)
app.post('/api/transactions', async (req, res) => {
  const { transaction: txData, lines } = req.body;

  try {
    // PRODUCTION_WELD, PRODUCTION_PAINT인 경우 BOM 자동 차감
    if (['PRODUCTION_WELD', 'PRODUCTION_PAINT'].includes(txData.type)) {
      // 1. 생산 라인 찾기 (양수 수량)
      const productionLine = lines.find((l: any) => parseFloat(l.quantity) > 0);
      if (!productionLine) {
        return res.status(400).json({ error: '생산 라인이 없습니다' });
      }

      // 2. BOM 조회
      const month = txData.date.substring(0, 7);
      const bom = await storage.getBomByProductAndMonth(productionLine.itemId, month);

      // 3. BOM 기반 차감 라인 자동 생성
      const consumptionLines = storage.generateConsumptionLines(
        bom,
        parseFloat(productionLine.quantity)
      );

      // 4. 재고 검증 (차감될 자재)
      const inventoryCheck = await storage.validateInventoryAvailability(
        consumptionLines,
        txData.date
      );
      if (!inventoryCheck.valid) {
        return res.status(400).json({
          error: '재고 부족',
          code: 'INSUFFICIENT_INVENTORY',
          details: inventoryCheck.details
        });
      }

      // 5. 최종 라인 = 생산 라인 + 차감 라인
      const finalLines = [productionLine, ...consumptionLines];

      // 6. 트랜잭션 저장
      const result = await storage.createTransaction(txData, finalLines);
      return res.json(result);
    }

    // 다른 타입은 기존 로직 유지
    // ... (PURCHASE_RECEIPT, SHIPMENT, SCRAP_SHIPMENT, PRODUCTION_PRESS 등)
  } catch (error) {
    res.status(500).json({ error: '트랜잭션 생성 실패' });
  }
});
```

**체크리스트**:
- [ ] PRODUCTION_WELD/PAINT 분기 처리
- [ ] BOM 조회 로직
- [ ] 차감 라인 자동 생성
- [ ] 재고 검증
- [ ] 최종 라인 저장

---

### 15-3. storage.ts generateConsumptionLines() 추가

**수정 파일**: `server/storage.ts`

```typescript
generateConsumptionLines(bom: any, quantity: number): Array<{
  itemId: string;
  quantity: string;
  price: null;
  amount: null;
}> {
  if (!bom || !bom.lines || bom.lines.length === 0) {
    return [];
  }

  return bom.lines.map((bomLine: any) => ({
    itemId: bomLine.materialId || bomLine.material_id,
    quantity: (-Number(bomLine.quantity) * quantity).toString(),
    price: null,
    amount: null
  }));
}
```

**체크리스트**:
- [ ] generateConsumptionLines() 메서드 추가
- [ ] snake_case/camelCase 필드명 처리

---

### 15-4. 기존 validateBomConsumption 제거

**수정 파일**: `server/routes.ts`, `server/storage.ts`

```typescript
// routes.ts에서 삭제 (약 라인 340-364)
// - validateBomConsumption 호출 제거
// - BOM_VALIDATION_FAILED 에러 코드 제거

// storage.ts에서 삭제 또는 주석 처리
// - validateBomConsumption() 메서드 (약 라인 893-960)
```

**체크리스트**:
- [ ] routes.ts에서 validateBomConsumption 호출 제거
- [ ] storage.ts에서 validateBomConsumption 주석 처리 (백업용)

---

## Phase 16: 테스트 및 문서화

### 16-1. 월마감 시나리오 테스트

1. 스냅샷 생성
2. 실사 입력 (산출과 다르게)
3. 마감 확정
4. 조정 트랜잭션 생성 확인
5. 다음 달 재고 조회 → 실사재고 기준 확인

### 16-2. 생산 입력 시나리오 테스트

1. BOM 등록 및 확정
2. PRODUCTION_WELD 입력 (생산 라인만)
3. 차감 라인 자동 생성 확인
4. 재고 변동 확인

### 16-3. 문서화

- [ ] COMPLETED-FEATURES.md 업데이트
- [ ] NEXT-STEPS.md에서 완료 항목 이동

---

## 수정 대상 파일 요약

| 파일 | Phase | 수정 내용 |
|------|-------|----------|
| `server/storage.ts` | 14, 15 | createAdjustmentTransactions, getLatestClosedSnapshotLine, generateConsumptionLines |
| `server/routes.ts` | 14, 15 | closeSnapshot 수정, transactions BOM 자동 차감 |
| `client/src/pages/Closing.tsx` | 14 | 마감 확인 메시지 |
| `client/src/pages/DailyEntry.tsx` | 15 | 차감 라인 생성 제거 |
| `docs/COMPLETED-FEATURES.md` | 16 | Phase 14-15 문서화 |

---

## 예상 완료 후 상태

| 원칙 | 현재 | 완료 후 |
|------|------|--------|
| 기초/기말 시스템 산출 | 50% | 100% |
| 생산 입력 = 결과만 | 70% | 100% |
| 월말 실사 리셋 | 0% | 100% |

**Process.md 원칙 준수율: 70% → 100%**
