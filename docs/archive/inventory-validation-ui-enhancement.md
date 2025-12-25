# Inventory Validation UI Enhancement

## Summary

Enhanced the DailyEntry page with real-time inventory validation and visual feedback to prevent inventory shortages during shipment and production operations.

## Changes Made

### 1. Enhanced LineItemEditor Component
**File**: `client/src/components/daily-entry/LineItemEditor.tsx`

**New Features**:
- Added `getInventory`, `currentDate`, and `mode` props for inventory validation
- Real-time inventory display in shipment mode
- Visual feedback for inventory shortages:
  - Red border on quantity input when quantity exceeds available stock
  - Inline warning message showing current stock vs. required quantity
  - Stock level display in label (e.g., "재고: 100.00")

**UI Elements**:
```tsx
// Stock level in label
수량 (재고: 100.00)

// Red border on input when shortage detected
<Input className="border-destructive focus-visible:ring-destructive" />

// Inline warning below line item
<div className="bg-destructive/10 border border-destructive/20">
  <AlertCircle /> 재고 부족: 필요 150 ea, 현재 100 ea
</div>
```

### 2. New MaterialConsumptionAlert Component
**File**: `client/src/components/daily-entry/MaterialConsumptionAlert.tsx`

**Purpose**: Display BOM material consumption preview with inventory validation for production mode.

**Features**:
- Automatically calculates material requirements based on production quantity
- Shows current inventory vs. required quantity for each material
- Displays shortages prominently with warning icon
- Sorts materials to show shortages first
- Visual states:
  - **Green** (all materials available): CheckCircle icon
  - **Red** (shortage detected): AlertCircle icon with detailed shortage info

**Example Output**:
```
재고 부족 - 생산 불가

⚠️ Steel Coil 2.0t    필요: 25.00 kg / 현재: 10.00 kg (부족: 15.00 kg)
   Paint Black        필요: 5.00 L / 현재: 200.00 L

위 자재의 재고가 부족하여 생산을 진행할 수 없습니다.
```

### 3. Updated DailyEntry Page
**File**: `client/src/pages/DailyEntry.tsx`

**Shipment Mode Enhancements**:
- Passed `getInventory`, `currentDate`, and `mode="shipment"` to LineItemEditor
- Real-time validation prevents negative inventory before submission

**Production Mode Enhancements**:
- Added `currentConsumption` calculation that runs automatically when production item/quantity changes
- Displays MaterialConsumptionAlert above the submit button
- Shows material shortages before user attempts to submit

**Scrap Mode Enhancements**:
- Added real-time inventory display in label: "(현재고: X.XX kg)"
- Red border on weight input when exceeds available stock
- Inline Alert component showing shortage details

### 4. Export Updates
**File**: `client/src/components/daily-entry/index.ts`

- Exported `MaterialConsumptionAlert` component

## User Experience Flow

### Shipment Flow
1. User selects shipment mode
2. User adds line items with products
3. When item is selected, current inventory displays in label
4. As user enters quantity:
   - If quantity > inventory: red border + warning message appears
   - If quantity <= inventory: normal display
5. Existing toast validation still runs on submit as final check

### Production Flow
1. User selects production mode and process type
2. User selects production item and enters quantity
3. MaterialConsumptionAlert automatically appears showing:
   - All required materials from BOM
   - Current inventory vs. required quantity for each
   - Shortages highlighted in red with deficit amount
4. User can adjust production quantity or check material inventory
5. Existing validation on submit prevents execution if shortage exists

### Scrap Flow
1. User selects scrap mode
2. User selects scrap item
3. Current inventory displays in label
4. As user enters weight:
   - If weight > inventory: red border + Alert appears
   - If weight <= inventory: normal display
5. Existing validation on submit as final check

## Technical Details

### Inventory Check Logic
- Uses `getInventory(itemId, date)` from mock-db.tsx
- Date parameter allows checking inventory as of specific date
- Returns calculated quantity based on transaction history

### Visual Feedback Classes
```tsx
// Destructive border on input
className="border-destructive focus-visible:ring-destructive"

// Warning background
className="bg-destructive/10 border border-destructive/20"

// Conditional styling with cn()
className={cn(
  hasInventoryShortage && "border-destructive focus-visible:ring-destructive"
)}
```

### Accessibility
- AlertCircle icons for visual cues
- Descriptive text for screen readers
- Semantic HTML with proper ARIA labels
- Color coding supplemented with text descriptions

## Benefits

1. **Prevention**: Catches inventory issues before submission
2. **Real-time Feedback**: Users see problems as they type
3. **Clear Communication**: Exact shortage amounts displayed
4. **Reduced Errors**: Less reliance on toast messages that can be missed
5. **Better UX**: Visual cues (colors, icons) guide user attention
6. **Production Planning**: Material consumption preview helps plan production batches

## Testing Checklist

- [ ] Shipment mode shows inventory for each line item
- [ ] Red border appears when shipment quantity exceeds stock
- [ ] Production mode shows MaterialConsumptionAlert
- [ ] Alert turns red when material shortage detected
- [ ] Scrap mode shows current inventory in label
- [ ] Multiple line items validated independently
- [ ] Date changes trigger inventory recalculation
- [ ] Works correctly with empty inventory
- [ ] Works correctly with existing transactions

## Future Enhancements

1. Add visual "low stock" warning (e.g., yellow when < 20% remaining)
2. Suggest alternative items when shortage detected
3. Link to purchase receipt form for quick material ordering
4. Show inventory trend chart on hover
5. Add bulk validation across all tabs
