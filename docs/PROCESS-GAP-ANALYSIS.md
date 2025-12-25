# Process.md 설계 원칙 GAP 분석

> 분석일: 2025-12-25
> 대상: Metal-Flow-ERP 현재 구현 vs process.md 설계 원칙
> **최종 상태: Phase 14-15 완료**

---

## 요약

**전체 구현율: 100%** ✅ (Phase 14-15 완료)

| 원칙 | 구현율 | 상태 |
|------|--------|------|
| 1. 사람은 "사건"만 입력 | 100% | ✅ 완전 |
| 2. 기초/기말 시스템 산출 | 100% | ✅ Phase 14-2 완료 |
| 3. 품목 마스터가 분기 결정 | 100% | ✅ 완전 |
| 4. BOM 월1회 FIX | 100% | ✅ 완전 |
| 5. 생산 입력 = 결과만 | 100% | ✅ Phase 15 완료 |
| 6. 월말 실사 리셋 → 기초재고 | 100% | ✅ Phase 14-1,3 완료 |
| 7. 스크랩 = 반출 기준만 | 100% | ✅ 완전 |
| 8. 원자재 = 수불만 | 100% | ✅ 완전 |

---

## 상세 분석

### ✅ 원칙 1: 사람은 "사건"만 입력 (100%)

**process.md 원문**:
> "단순한 시스템 구성 → 사람이 입력하는 것은 오직 날짜, 품목, 수량, 이벤트 타입"

**현재 구현**:
- `DailyEntry.tsx`: 날짜, 품목, 수량, 거래 유형만 입력
- 기초/기말 입력 화면 없음
- 관리자 1인이 모든 사건 입력

**파일 위치**: `client/src/pages/DailyEntry.tsx`

---

### ✅ 원칙 2: 기초/기말 시스템 산출 (100%) - Phase 14-2 완료

**process.md 원문**:
> "기초/기말은 시스템이 산출한다. 사람이 직접 입력하면 100% 틀린다."

**구현 완료 (Phase 14-2)**:
- ✅ 월내 재고 계산: `getInventory()` 트랜잭션 합산
- ✅ 스냅샷 산출재고: 시스템이 계산
- ✅ **월간 이월 로직**: `getLatestClosedSnapshotLine()` + `sumTransactionsInRange()`

**동작 방식**:
```
2025-01 마감 (실사재고: 100)
2025-02 조회 시:
  → CLOSED 스냅샷 찾기 (2025-01)
  → 2025-01 실사재고(100) + 2월 트랜잭션 합산
```

**파일 위치**: `server/storage.ts` (getInventory, getLatestClosedSnapshotLine, sumTransactionsInRange)

---

### ✅ 원칙 3: 품목 마스터가 분기 결정 (100%)

**process.md 원문**:
> "제품(P) / 부자재(P) / 반제품(P) 구분은 생산 입력 시 변경 불가. 품목 마스터에서만 수정 가능"

**현재 구현**:
- `items.type`: RAW | SUB | PRODUCT | SCRAP | CONSUMABLE
- `items.process`: PRESS | WELD | PAINT | NONE
- DailyEntry에서 공정별/유형별 품목 자동 필터링

**파일 위치**:
- `shared/schema.ts`
- `client/src/pages/DailyEntry.tsx`

---

### ✅ 원칙 4: BOM 월1회 FIX (100%)

**process.md 원문**:
> "BOM 월 1회 FIX. 월중 변경 불가, 신규 품목만 추가 허용"

**현재 구현**:
- `bomHeaders.isFixed`: 월별 확정 플래그
- `/api/bom/fix/:month`: 월별 BOM 확정 API
- 확정된 BOM은 수정 불가 (UI에서 차단)

**파일 위치**:
- `server/routes.ts`
- `client/src/pages/BOM.tsx`

---

### ✅ 원칙 5: 생산 입력 = 결과만 (100%) - Phase 15 완료

**process.md 원문**:
> "공정의 '투입'은 사람이 입력하지 않고, 생산 결과 수량만 입력하면 BOM에 의해 투입·소모·전환이 시스템에서 자동 처리된다."

**구현 완료 (Phase 15)**:
- ✅ 프론트엔드: 생산 라인만 전송 (차감 라인 제거)
- ✅ 백엔드: `generateConsumptionLines()` 로 BOM 기반 자동 생성
- ✅ 재고 검증 후 최종 라인 = 생산 라인 + 차감 라인

**동작 방식**:
```typescript
// 프론트엔드 (DailyEntry.tsx)
const txLines = [{ itemId: prodItemId, quantity: prodQty.toString() }];
// 차감 라인은 백엔드에서 자동 생성

// 백엔드 (routes.ts)
const bom = await storage.getBomByProductAndMonth(itemId, month);
const consumptionLines = storage.generateConsumptionLines(bom, quantity);
const finalLines = [productionLine, ...consumptionLines];
```

**파일 위치**:
- `client/src/pages/DailyEntry.tsx`
- `server/routes.ts`
- `server/storage.ts`

---

### ✅ 원칙 6: 월말 실사 리셋 → 기초재고 (100%) - Phase 14-1,3 완료

**process.md 원문**:
> "월말 실사재고를 다음 달 기초재고로 리셋하는 방식은 실패를 숨기는 행위가 아니라 현실을 제도화하는 행위다."

**구현 완료 (Phase 14-1, 14-3)**:
- ✅ Closing 4단계: 스냅샷 → 실사 → 차이 → 확정
- ✅ **조정 트랜잭션 자동 생성**: `createAdjustmentTransactions()`
- ✅ **기초재고 리셋**: `getInventory()` 동적 이월 로직

**동작 방식**:
```typescript
// 마감 시 (routes.ts)
const adjustmentTxId = await storage.createAdjustmentTransactions(month);
await storage.updateInventorySnapshot(snapshot.id, {
  status: 'CLOSED',
  closedAt: new Date(),
  adjustmentTxId
});

// 다음 달 재고 조회 시 (storage.ts)
const closedSnapshot = await this.getLatestClosedSnapshotLine(itemId, currentMonth);
if (closedSnapshot) {
  return baseQty + deltaQty;  // 실사재고 + 이후 트랜잭션
}
```

**파일 위치**:
- `server/routes.ts` (POST /api/snapshots/:month/close)
- `server/storage.ts` (createAdjustmentTransactions, getInventory)

---

### ✅ 원칙 7: 스크랩 = 반출 기준만 (100%)

**process.md 원문**:
> "스크랩 발생량 ❌, 스크랩 반출량 ⭕. 거래처, 중량, 금액만 관리"

**현재 구현**:
- `SCRAP_SHIPMENT` 거래 유형으로 반출만 관리
- 발생량 입력 화면 없음
- 거래처, 수량, 금액 입력

**파일 위치**: `client/src/pages/DailyEntry.tsx`

---

### ✅ 원칙 8: 원자재 = 수불만 (100%)

**process.md 원문**:
> "입고 기록 O, 출고/반출 기록 O, 생산 투입 자동 차감 ❌"

**현재 구현**:
- PRODUCTION_PRESS: BOM 차감 없음 (수불만 관리)
- PRODUCTION_WELD/PAINT: BOM 차감 적용
- 원자재는 PURCHASE_RECEIPT로 입고만 기록

**파일 위치**:
- `server/routes.ts` (productionTypes 배열에 PRESS 미포함)

---

## Phase 14-15 완료 작업

### Phase 14: 월마감 완전 구현 ✅

| 작업 | 설명 | 파일 |
|------|------|------|
| 14-1 | createAdjustmentTransactions() | storage.ts |
| 14-2 | getInventory() 동적 이월 로직 | storage.ts |
| 14-3 | closeSnapshot 엔드포인트 수정 | routes.ts |
| 14-4 | Closing.tsx UI 메시지 개선 | Closing.tsx |

### Phase 15: 백엔드 BOM 자동 차감 ✅

| 작업 | 설명 | 파일 |
|------|------|------|
| 15-1 | 프론트엔드 차감 라인 제거 | DailyEntry.tsx |
| 15-2 | 백엔드 BOM 자동 차감 | routes.ts |
| 15-3 | generateConsumptionLines() | storage.ts |
| 15-4 | validateBomConsumption 제거 | routes.ts |

---

## 선택 개선사항 (P1)

| 작업 | 설명 | 상태 |
|------|------|------|
| 예외 투입 기능 | 대체 부자재 사용 허용 | 미구현 |
| 마감 후 수정 방지 | 마감된 월 트랜잭션 수정 차단 | 미구현 |

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| `docs/plan/process.md` | ERP 설계 철학 원본 |
| `docs/PHASE-14-15-PLAN.md` | 구현 계획 상세 |
| `docs/COMPLETED-FEATURES.md` | 완료된 기능 목록 (Phase 1-15) |
