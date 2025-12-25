# Metal-Flow-ERP 구현 설계서

> **상세 완료 내역**: `docs/COMPLETED-FEATURES.md` 참조
> **다음 할일**: `docs/NEXT-STEPS.md` 참조

---

## 1. 프로젝트 개요

### 1.1 목적
금속 제조업체를 위한 재고관리 ERP 시스템 구축

### 1.2 핵심 설계 원칙 (process.md 기반)

1. **사람은 "사건(Event)"만 입력**: 일자, 품목, 수량, 거래유형
2. **시스템이 파생값 계산**: 재고, BOM 차감, 기초/기말 재고
3. **품목 마스터가 분기 결정**: 생산물 성격은 품명에서 확정
4. **월 단위 관리**: BOM, 단가, 재고 스냅샷 모두 월 단위로 확정

### 1.3 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, TypeScript, Vite, Shadcn UI |
| Backend | Express, Drizzle ORM, PostgreSQL |
| 상태관리 | React Context (현재) → TanStack Query (예정) |

---

## 2. 도메인 모델

### 2.1 품목 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| RAW | 원자재 | 철판 코일, 페인트 |
| SUB | 부자재 | 볼트, 너트 |
| PRODUCT | 완제품 | 브라켓 Assy 완성품 |
| SCRAP | 스크랩 | 철 스크랩 |
| CONSUMABLE | 소모품 | 장갑, 공구 |

### 2.2 공정 유형

| 공정 | 설명 | BOM 적용 |
|------|------|----------|
| PRESS | 프레스 | 수불관리만 |
| WELD | 용접 | BOM 자동 차감 |
| PAINT | 도장 | BOM 자동 차감 |

### 2.3 거래 유형

| 유형 | 설명 |
|------|------|
| PURCHASE_RECEIPT | 구매 입고 |
| PRODUCTION_PRESS | 프레스 생산 |
| PRODUCTION_WELD | 용접 생산 |
| PRODUCTION_PAINT | 도장 생산 |
| SHIPMENT | 납품 출고 |
| SCRAP_SHIPMENT | 스크랩 반출 |
| ADJUSTMENT | 재고 조정 |
| TRANSFER | 재고 이동 |

### 2.4 제조 흐름도

```
구매입고 → [RAW/SUB]
              ↓
         [PRESS] → 제품/반제품/스크랩
              ↓
         [WELD] → 제품/반제품 (BOM 자동차감)
              ↓
         [PAINT] → 완제품 (BOM 자동차감)
              ↓
         납품출고 → [CUSTOMER]
```

---

## 3. Phase 진행 상황

### 완료된 Phase (1-11)

| Phase | 내용 | 상태 |
|-------|------|------|
| 1-6 | 기본 기능 (Dashboard, DailyEntry, BOM, Prices, Closing, Inventory) | ✅ |
| 7 | 품목 CRUD | ✅ |
| 8 | 거래처 관리 | ✅ |
| 9 | 보고서 강화 (수불부, CSV) | ✅ |
| 10 | 거래내역 조회, 검증 강화 | ✅ |
| 11 | 엑셀 스타일 입력 UX | ✅ |
| - | 거래처 필수 검증 강화 | ✅ |
| - | 재고 마이너스 방지 UI | ✅ |
| - | 인쇄 스타일 (@media print) | ✅ |

### 예정된 Phase

| Phase | 내용 | 우선순위 |
|-------|------|----------|
| 12 | Backend API 연동 | 필수 |
| 13 | PDF 내보내기 | 선택 |
| - | LOT/배치 관리 | 고도화 |
| - | 위치 관리 | 고도화 |

---

## 4. 파일 구조

```
client/src/
├── pages/           # 페이지 컴포넌트
├── components/      # UI 컴포넌트
│   ├── daily-entry/ # 전표 입력 관련
│   ├── layout/      # 레이아웃
│   └── ui/          # Shadcn UI
├── lib/
│   ├── types.ts     # 도메인 타입
│   ├── mock-db.tsx  # 비즈니스 로직
│   └── utils.ts     # 유틸리티
└── index.css        # 스타일 (print 포함)

server/
├── index.ts         # Express 서버
├── routes.ts        # API 라우트 (미구현)
└── storage.ts       # IStorage 인터페이스

shared/
└── schema.ts        # Drizzle 스키마 (미완성)

docs/
├── COMPLETED-FEATURES.md  # 완료된 기능 상세
├── NEXT-STEPS.md          # 다음 할일
├── plan/
│   ├── implementation-plan.md  # 이 문서
│   └── process.md              # 설계 철학 원본
└── archive/                    # 통합된 기존 문서
```

---

## 5. 참고 문서

| 문서 | 설명 |
|------|------|
| `docs/COMPLETED-FEATURES.md` | 완료된 기능 상세 (Phase 1-11) |
| `docs/NEXT-STEPS.md` | 다음 할일 (Phase 12+) |
| `docs/plan/process.md` | ERP 설계 철학 원본 |
| `CLAUDE.md` | Claude Code 프로젝트 가이드 |
