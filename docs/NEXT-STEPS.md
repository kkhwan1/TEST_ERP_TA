# Metal-Flow-ERP 다음 할일

> **최종 업데이트**: 2025-12-25
> **현재 상태**: Phase 15 완료 | Process.md 100% 준수 | Supabase 연동 완료

---

## 완료된 작업

### ✅ Phase 12: Backend API 연동 (COMPLETE)

- **Drizzle 스키마 완성**: 모든 도메인 테이블 정의 완료
- **Supabase 연동**: PostgreSQL + Express.js API
- **프론트엔드 연동**: TanStack Query + api.ts

### ✅ Phase 13: 백엔드 검증 강화 (COMPLETE)

- 재고 부족 체크: `validateInventoryAvailability()`
- BOM 검증: `validateBomConsumption()` (이후 Phase 15에서 제거)

### ✅ Phase 14: 월마감 완전 구현 (COMPLETE)

- 조정 트랜잭션 자동 생성: `createAdjustmentTransactions()`
- 동적 이월 로직: `getInventory()` + `getLatestClosedSnapshotLine()`
- closeSnapshot 엔드포인트 수정
- Closing.tsx UI 메시지 개선

### ✅ Phase 15: 백엔드 BOM 자동 차감 (COMPLETE)

- 프론트엔드 차감 라인 제거 (DailyEntry.tsx)
- 백엔드 BOM 자동 생성: `generateConsumptionLines()`
- validateBomConsumption 호출 제거

---

## 다음 작업 (운영 전 필수)

### 1. 인증/인가 구현

**현재 상태**: Supabase 익명 접근 허용

**필요 작업**:
```typescript
// Supabase Auth 적용
- Email/Password 인증 설정
- RLS 정책 사용자 기반으로 전환
- 세션 관리 및 로그아웃
- 관리자 전용 (1인 사용 가정)
```

### 2. 페이지네이션

**현재 상태**: 전체 데이터 일괄 로드

**필요 작업**:
```typescript
// 대용량 데이터 처리
- Transactions 페이지: 페이지네이션 또는 무한 스크롤
- Inventory Ledger: 기간 제한 또는 페이징
- Supabase range() 활용
```

### 3. 마감 후 수정 방지

**현재 상태**: 마감된 월에도 트랜잭션 입력 가능 (UI 경고만)

**필요 작업**:
```typescript
// 백엔드 수정 차단
- POST /api/transactions에서 마감된 월 체크
- 마감된 월이면 400 에러 반환
```

---

## 선택 작업 (운영 편의)

### PDF 내보내기

- **현재**: CSV 다운로드 + 브라우저 인쇄
- **개선**: react-pdf 또는 서버사이드 PDF 생성
- **적용 대상**: 거래명세서, 재고보고서, 수불부

### 다국어 지원 (i18n)

- **현재**: 하드코딩된 한글
- **개선**: react-i18next 적용
- **우선순위**: 낮음 (1인 사용 가정)

### 다크 모드

- **현재**: 라이트 모드만
- **개선**: Tailwind CSS dark: 변형 적용
- **우선순위**: 낮음

---

## 향후 고도화 (process.md "2단계 이후")

### LOT/배치 관리

- 원자재 LOT 추적
- 제품 역추적 (Traceability)
- **적용 시점**: 품질 이슈 발생 시

### 위치 관리

- 창고/랙 위치 기록
- 입고/출고 시 위치 선택
- **적용 시점**: 창고 확장 시

### 원자재 BOM 자동차감 고도화

- 현재: 수불관리만 (의도적 제외)
- 개선: 프레스 공정 BOM 연동 + 손실률 분석
- **적용 시점**: 손실 분석 필요 시

### BOM 버전 이력

- 현재: 월별 복사만 가능
- 개선: 변경 이력 추적 및 감사
- **적용 시점**: 감사 요구 시

### 대시보드 차트 고도화

- 현재: 기본 KPI 카드 + 간단한 차트
- 개선: 시계열 분석, 생산성 지표, 재고 회전율
- **적용 시점**: 데이터 축적 후 (3개월+)

---

## 의도적으로 제외된 기능

| 기능 | 제외 사유 |
|------|----------|
| 스크랩 발생량 관리 | process.md: "반출 기준만 관리" |
| 감사 추적 (Audit Trail) | 관리자 1인 구조에서 불필요 |
| 사용자 권한 관리 | 관리자 1인 구조 |
| 재주문점 알림 | 안전재고 관리 미계획 |
| 실시간 알림 | 1인 사용 환경에서 불필요 |

---

## 작업 우선순위

```
[운영 전 필수]
   ├── 인증/인가 구현 (Supabase Auth)
   ├── BOM 자동차감 로직
   ├── 유효성 검사 강화 (Zod)
   └── 페이지네이션 (대용량 대비)

[선택] PDF 내보내기
[선택] 다국어 지원
[선택] 다크 모드

[고도화] LOT 관리
[고도화] 위치 관리
[고도화] 원자재 BOM 고도화
[고도화] BOM 버전 이력
[고도화] 대시보드 차트
```

---

## 기술 스택 현황

| 레이어 | 기술 | 상태 |
|--------|------|------|
| 프론트엔드 | React 19 + Vite + shadcn/ui | ✅ 완료 |
| 상태 관리 | TanStack Query | ✅ 완료 |
| 백엔드 | Supabase (PostgreSQL + RPC) | ✅ 완료 |
| ORM | Drizzle ORM | ✅ 완료 |
| 인증 | Supabase Auth | ⏳ 미구현 |
| 배포 | Vercel (예정) | ⏳ 미구현 |

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| `docs/COMPLETED-FEATURES.md` | 완료된 기능 통합 문서 (Phase 1-15) |
| `docs/plan/process.md` | ERP 설계 철학 원본 |
| `CLAUDE.md` | Claude Code 프로젝트 가이드 |
| `shared/schema.ts` | Drizzle 스키마 정의 |
| `client/src/lib/api.ts` | Supabase API 클라이언트 |
