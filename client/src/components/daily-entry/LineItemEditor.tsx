import { useRef, useCallback, useId, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, AlertCircle } from "lucide-react";
import { Item } from "@/lib/types";
import { ItemCombobox } from "./ItemCombobox";
import { cn } from "@/lib/utils";

export interface LineItem {
  id: string; // Stable unique ID for React key
  itemId: string;
  quantity: number;
  price: number;
}

interface LineItemEditorProps {
  lines: LineItem[];
  items: Item[];
  onChange: (lines: LineItem[]) => void;
  showPrice?: boolean;
  priceLabel?: string;
  getInventory?: (itemId: string, date?: string) => number;
  currentDate?: string;
  mode?: "receipt" | "shipment" | "production";
}

// Cell type for navigation
type CellType = 'item' | 'quantity' | 'price';

// Generate unique line ID
const generateLineId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function LineItemEditor({
  lines,
  items,
  onChange,
  showPrice = true,
  priceLabel = "단가",
  getInventory,
  currentDate,
  mode = "receipt",
}: LineItemEditorProps) {
  // Unique ID prefix for accessibility
  const idPrefix = useId();

  // Check if inventory validation is needed (only for shipment mode)
  const needsInventoryValidation = mode === "shipment" && getInventory;

  // 성능 최적화: items를 Map으로 캐싱하여 O(1) 조회 (Codex 리뷰 반영)
  const itemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  // Refs for each cell: Map<"lineId-col", HTMLElement>
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  const getCellKey = (lineId: string, colType: CellType) => `${lineId}-${colType}`;

  const registerCell = useCallback((lineId: string, colType: CellType, element: HTMLElement | null) => {
    const key = getCellKey(lineId, colType);
    if (element) {
      cellRefs.current.set(key, element);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  const focusCell = useCallback((lineId: string, colType: CellType) => {
    const key = getCellKey(lineId, colType);
    const element = cellRefs.current.get(key);
    if (element) {
      element.focus();
    }
  }, []);

  const focusCellByIndex = useCallback((rowIdx: number, colType: CellType) => {
    if (rowIdx >= 0 && rowIdx < lines.length) {
      focusCell(lines[rowIdx].id, colType);
    }
  }, [lines, focusCell]);

  const handleAddLine = useCallback(() => {
    onChange([...lines, { id: generateLineId(), itemId: "", quantity: 0, price: 0 }]);
  }, [lines, onChange]);

  const updateLine = useCallback((lineId: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    const newLines = lines.map(line =>
      line.id === lineId ? { ...line, [field]: value } : line
    );
    onChange(newLines);
  }, [lines, onChange]);

  const removeLine = useCallback((lineId: string) => {
    if (lines.length === 1) return;
    // Clean up refs for removed line
    cellRefs.current.delete(getCellKey(lineId, 'item'));
    cellRefs.current.delete(getCellKey(lineId, 'quantity'));
    cellRefs.current.delete(getCellKey(lineId, 'price'));
    onChange(lines.filter(line => line.id !== lineId));
  }, [lines, onChange]);

  // Auto-add row when selecting item in last row (FIXED: single state update)
  const handleItemChange = useCallback((lineId: string, itemId: string, isLastRow: boolean) => {
    if (isLastRow && itemId !== "") {
      // Combine update and add in single onChange call to avoid stale state
      const newLines = lines.map(line =>
        line.id === lineId ? { ...line, itemId } : line
      );
      newLines.push({ id: generateLineId(), itemId: "", quantity: 0, price: 0 });
      onChange(newLines);
    } else {
      updateLine(lineId, "itemId", itemId);
    }
  }, [lines, onChange, updateLine]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    rowIdx: number,
    currentCol: CellType
  ) => {
    // IME 입력 중에는 네비게이션을 막지 않음 (Codex 리뷰 반영: 한글 입력 시 문제 방지)
    if (e.nativeEvent.isComposing) return;

    const isTab = e.key === 'Tab';
    const isEnter = e.key === 'Enter';
    const isShiftTab = isTab && e.shiftKey;

    if (!isTab && !isEnter) return;

    const columns: CellType[] = showPrice
      ? ['item', 'quantity', 'price']
      : ['item', 'quantity'];

    const currentColIdx = columns.indexOf(currentCol);
    const maxRow = lines.length - 1;

    // Allow default Tab at boundaries (accessibility: don't trap focus)
    if (isShiftTab && rowIdx === 0 && currentColIdx === 0) {
      return; // Let browser handle Shift+Tab out of component
    }
    if (isTab && !e.shiftKey && rowIdx === maxRow && currentColIdx === columns.length - 1) {
      // At last cell, add row but allow Tab to continue
      handleAddLine();
      return;
    }

    e.preventDefault();

    if (isEnter) {
      if (rowIdx < maxRow) {
        focusCellByIndex(rowIdx + 1, currentCol);
      } else {
        handleAddLine();
        requestAnimationFrame(() => focusCellByIndex(rowIdx + 1, currentCol));
      }
    } else if (isShiftTab) {
      if (currentColIdx > 0) {
        focusCellByIndex(rowIdx, columns[currentColIdx - 1]);
      } else if (rowIdx > 0) {
        focusCellByIndex(rowIdx - 1, columns[columns.length - 1]);
      }
    } else if (isTab) {
      if (currentColIdx < columns.length - 1) {
        focusCellByIndex(rowIdx, columns[currentColIdx + 1]);
      } else if (rowIdx < maxRow) {
        focusCellByIndex(rowIdx + 1, columns[0]);
      }
    }
  }, [showPrice, lines.length, handleAddLine, focusCellByIndex]);

  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">품목 리스트</h3>
        <Button size="sm" variant="outline" onClick={handleAddLine}>
          <Plus className="mr-2 h-4 w-4" /> 행 추가
        </Button>
      </div>

      <div className="space-y-3" role="list" aria-label="품목 입력 목록">
        {lines.map((line, idx) => {
          const isLastRow = idx === lines.length - 1;
          const itemInputId = `${idPrefix}-item-${line.id}`;
          const qtyInputId = `${idPrefix}-qty-${line.id}`;
          const priceInputId = `${idPrefix}-price-${line.id}`;

          // Inventory validation
          const currentInventory = needsInventoryValidation && line.itemId
            ? getInventory!(line.itemId, currentDate)
            : null;
          const hasInventoryShortage = needsInventoryValidation
            && currentInventory !== null
            && line.quantity > 0
            && line.quantity > currentInventory;

          // 캐싱된 Map 사용으로 O(1) 조회 (Codex 리뷰 반영)
          const selectedItem = line.itemId ? itemsMap.get(line.itemId) : undefined;

          return (
            <div key={line.id} role="listitem">
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={itemInputId} className="text-xs text-muted-foreground">품목</Label>
                  <div
                    ref={(el) => {
                      if (el) {
                        const button = el.querySelector('button');
                        registerCell(line.id, 'item', button);
                      } else {
                        registerCell(line.id, 'item', null);
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, idx, 'item')}
                  >
                    <ItemCombobox
                      items={items}
                      value={line.itemId}
                      onChange={(val) => handleItemChange(line.id, val, isLastRow)}
                    />
                  </div>
                </div>

                <div className="w-28 space-y-1">
                  <Label htmlFor={qtyInputId} className="text-xs text-muted-foreground">
                    수량
                    {needsInventoryValidation && currentInventory !== null && line.itemId && (
                      <span className={cn(
                        "ml-1 text-xs",
                        hasInventoryShortage ? "text-destructive font-semibold" : "text-muted-foreground"
                      )}>
                        (재고: {currentInventory.toFixed(2)})
                      </span>
                    )}
                  </Label>
                  <Input
                    id={qtyInputId}
                    type="number"
                    value={line.quantity === 0 ? "" : line.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateLine(line.id, "quantity", val === "" ? 0 : Number(val));
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => handleKeyDown(e, idx, 'quantity')}
                    ref={(el) => registerCell(line.id, 'quantity', el)}
                    min="0"
                    step="0.01"
                    aria-label="수량"
                    className={cn(
                      hasInventoryShortage && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>

              {showPrice && (
                <div className="w-32 space-y-1">
                  <Label htmlFor={priceInputId} className="text-xs text-muted-foreground">{priceLabel}</Label>
                  <Input
                    id={priceInputId}
                    type="number"
                    value={line.price === 0 ? "" : line.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateLine(line.id, "price", val === "" ? 0 : Number(val));
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => handleKeyDown(e, idx, 'price')}
                    ref={(el) => registerCell(line.id, 'price', el)}
                    min="0"
                    aria-label={priceLabel}
                  />
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLine(line.id)}
                disabled={lines.length === 1}
                className="mb-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`${idx + 1}번 행 삭제`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Inventory shortage warning - 스크린리더 지원 (Codex 리뷰 반영) */}
            {hasInventoryShortage && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 mt-1 p-2 bg-destructive/10 border border-destructive/20 rounded-md"
              >
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-xs text-destructive">
                  <span className="font-semibold">{selectedItem?.name}</span> 재고 부족:
                  필요 <span className="font-semibold">{line.quantity.toFixed(2)}</span> {selectedItem?.unit || 'ea'},
                  현재 <span className="font-semibold">{currentInventory!.toFixed(2)}</span> {selectedItem?.unit || 'ea'}
                </div>
              </div>
            )}
          </div>
          );
        })}

        {lines.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded">
            품목을 추가해주세요
          </div>
        )}
      </div>
    </div>
  );
}
