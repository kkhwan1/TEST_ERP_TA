# Print Functionality Documentation

## Overview
The Metal-Flow-ERP system now includes comprehensive print support for reports and data tables. The print styles are optimized for A4 paper with ink-saving features.

## Implementation

### Print Styles Location
`client/src/index.css` - Contains all `@media print` CSS rules

### Print Button Component
`client/src/components/ui/print-button.tsx` - Reusable print button component

## Pages with Print Support

1. **Inventory (재고/수불부)** - `client/src/pages/Inventory.tsx`
   - Current stock table
   - Item ledger (수불부)

2. **Closing (월마감)** - `client/src/pages/Closing.tsx`
   - Monthly closing reports
   - Inventory snapshots
   - Variance analysis

3. **Transactions (거래내역)** - `client/src/pages/Transactions.tsx`
   - Transaction history

## Print Features

### Hidden Elements (when printing)
- Sidebar navigation
- Header user info
- All buttons (except marked with `.print-keep`)
- Icons and SVGs
- Input fields and select dropdowns
- Tab lists
- Search bars

### Print-Optimized Elements
- **Tables**: Strong borders, compact spacing
- **Headers**: Page title with clear separator
- **Cards**: Simple borders, no shadows
- **Badges**: Black and white with borders
- **Page breaks**: Automatic page break prevention for table rows

### Print Specifications

#### Page Setup
- **Size**: A4
- **Margins**: 1cm all sides
- **Font size**: 10pt base, 9pt for tables
- **Line height**: 1.4

#### Table Formatting
- Border collapse with clear borders
- Header background: light gray (#e5e7eb)
- Cell padding: 0.15cm
- Numbers: Right-aligned
- Page break avoidance for rows

#### Ink Saving Features
- All backgrounds removed (white)
- All colors converted to black
- No shadows or decorative elements
- Minimized padding and spacing

## Usage

### User Instructions

1. Navigate to any supported page (Inventory, Closing, or Transactions)
2. Apply desired filters to show only the data you want to print
3. Click the "인쇄" (Print) button in the header
4. Browser print dialog will open
5. Select printer and confirm

### Developer Instructions

To add print support to a new page:

```tsx
import { PrintButton } from "@/components/ui/print-button";

// In your page component:
<AppLayout
  title="Your Page Title"
  actions={<PrintButton />}
>
  {/* Your content */}
</AppLayout>
```

### Custom Print Styling

Add page-specific print styles to `index.css`:

```css
@media print {
  /* Your custom print rules */
  .your-component {
    /* print-specific styling */
  }
}
```

### Print-Specific Classes

Available utility classes:

- `.print-show` - Force display when printing
- `.print-hide` - Force hide when printing
- `.print-keep` - Keep element (exception to hide rules)
- `.ledger-summary` - Special styling for ledger totals
- `.inventory-total` - Special styling for inventory totals

## Testing Print Layout

### Browser Testing
1. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
2. Use "Print Preview" to verify layout
3. Check all pages in multi-page reports
4. Verify table borders and alignment

### Recommended Settings
- **Layout**: Portrait for most reports
- **Margins**: Default (1cm)
- **Background graphics**: Off (for ink saving)
- **Headers and footers**: Optional

## Browser Compatibility

Tested and optimized for:
- Chrome/Edge (Recommended)
- Firefox
- Safari

## Known Limitations

1. Tab content: All tabs print simultaneously (not just active tab)
2. Interactive elements: Disabled in print mode
3. Color schemes: Converted to black and white for ink saving
4. Long tables: May break across pages (automatic handling)

## Future Enhancements

Potential improvements:
- PDF export with custom headers/footers
- Print-specific date ranges
- Page numbering
- Custom company logo placement
- Multi-page table headers (repeat on each page)
