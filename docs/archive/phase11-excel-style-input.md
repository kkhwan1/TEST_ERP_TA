# Phase 11: 엑셀 스타일 입력 UX 개선

## 개요

DailyEntry 페이지의 LineItemEditor를 엑셀처럼 클릭과 키보드로 빠르게 입력할 수 있도록 개선합니다.

## 현재 문제점

| 컴포넌트 | 현재 방식 | 문제점 |
|----------|----------|--------|
| ItemCombobox | Popover 클릭 → 검색 → 선택 | 3클릭 필요 |
| LineItemEditor | 버튼으로 행 추가 | 빈 행 없음, 연속 입력 불편 |
| 수량/단가 Input | 클릭 후 기존값 지우고 입력 | 즉시 덮어쓰기 불가 |
| 키보드 네비게이션 | 없음 | Tab/Enter 이동 불가 |

## 구현 범위 (Phase A + B)

### Phase A: 키보드 UX
1. Tab/Enter 키 네비게이션
2. 숫자 Input 전체 선택 (onFocus)
3. 마지막 행 자동 추가

### Phase B: 인라인 편집
4. ItemCombobox 인라인화 (포커스 시 자동 열림)
5. 타이핑 즉시 검색 시작

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `client/src/components/daily-entry/LineItemEditor.tsx` | 키보드 네비게이션, 자동 행 추가, ref 관리 |
| `client/src/components/daily-entry/ItemCombobox.tsx` | 인라인 모드, 포커스 시 자동 열림, 타이핑 검색 |

## 구현 상세

### 1. LineItemEditor 키보드 네비게이션

```tsx
// 각 셀에 ref 배열로 관리
const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

// 키보드 이벤트 핸들러
const handleCellKeyDown = (
  e: React.KeyboardEvent,
  rowIdx: number,
  colIdx: number,
  colCount: number
) => {
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    if (colIdx < colCount - 1) {
      focusCell(rowIdx, colIdx + 1);
    } else {
      focusCell(rowIdx + 1, 0); // 다음 행 첫 컬럼
    }
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    focusCell(rowIdx + 1, colIdx); // 아래 행 같은 컬럼
  }
};
```

### 2. 자동 행 추가

```tsx
const handleItemChange = (rowIdx: number, itemId: string) => {
  updateLine(rowIdx, 'itemId', itemId);

  // 마지막 행이고 품목이 선택되면 빈 행 추가
  if (rowIdx === lines.length - 1 && itemId) {
    onChange([...lines, { itemId: '', quantity: 0, price: 0 }]);
  }
};
```

### 3. ItemCombobox 인라인화

```tsx
// 포커스 시 자동 열림
const handleFocus = () => {
  setOpen(true);
};

// 타이핑 시 즉시 검색
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (/^[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]$/.test(e.key)) {
    setSearchQuery(prev => prev + e.key);
    setOpen(true);
  }
};
```

### 4. 숫자 Input 전체 선택

```tsx
<Input
  type="number"
  onFocus={(e) => e.target.select()}
/>
```

## 테스트 체크리스트

- [x] Tab 키로 품목 → 수량 → 단가 → 다음행 품목 이동
- [x] Shift+Tab으로 역방향 이동
- [x] Enter 키로 아래 행 같은 컬럼 이동
- [x] 마지막 행 품목 선택 시 빈 행 자동 추가
- [x] 빈 행만 있을 때 삭제 버튼 비활성화
- [x] 품목 필드 포커스 시 드롭다운 자동 열림
- [x] 품목 필드에서 타이핑하면 검색 시작 (한글/영문)
- [x] 숫자 필드 클릭 시 전체 선택
- [x] 기존 기능(삭제, 저장 등) 정상 작동

## 구현 완료

**완료일**: 2025-12-24

### Codex GPT 5.2 코드리뷰 결과 반영 (2025-12-24)

| 이슈 | 심각도 | 해결 방법 |
|------|--------|----------|
| handleItemChange 상태 경쟁 | Critical | 단일 onChange 호출로 수정 |
| index 기반 key 사용 | Warning | LineItem에 id 필드 추가, line.id 사용 |
| 접근성 누락 | Warning | htmlFor/id 연결, aria-label, role 추가 |
| 포커스 트랩 | Warning | 첫/마지막 셀 경계에서 기본 Tab 허용 |
| setTimeout 사용 | Warning | requestAnimationFrame으로 교체 |

### Codex GPT 5.2 코드리뷰 2차 반영 (2025-12-25)

| 파일 | 이슈 | 해결 방법 |
|------|------|----------|
| LineItemEditor.tsx | O(n*m) 조회 비용 | items를 Map으로 useMemo 캐싱 |
| LineItemEditor.tsx | IME 입력 중 네비게이션 문제 | `e.nativeEvent.isComposing` 체크 추가 |
| LineItemEditor.tsx | 재고 부족 알림 접근성 | `role="alert"` + `aria-live="polite"` 추가 |
| ItemCombobox.tsx | 팝오버 닫힐 때 검색어 유지 | `onOpenChange`에서 검색어 초기화 |
| MaterialConsumptionAlert.tsx | 매번 items.find 호출 | Map + useMemo로 캐싱 |
| MaterialConsumptionAlert.tsx | NaN/undefined 방어 누락 | Number.isFinite 체크 추가 |
| MaterialConsumptionAlert.tsx | 스크린리더 알림 누락 | `role="status"` + `aria-live="polite"` 추가 |
| print-button.tsx | SSR 환경 window 접근 오류 | `typeof window !== "undefined"` 가드 |
| print-button.tsx | 폼 제출 유발 가능성 | `type="button"` 명시 |
| index.css | 구식 page-break-* 사용 | break-after/inside 추가 |
| index.css | 흰 배경에 흰 글씨 가능성 | 텍스트 컬러 클래스 강제 오버라이드 |
| index.css | .grid 레이아웃 붕괴 | 선택적 적용으로 변경 (.print-block) |

## 관련 문서

- `docs/plan/implementation-plan.md` - 전체 구현 로드맵
- `docs/plan/process.md` - ERP 설계 철학
