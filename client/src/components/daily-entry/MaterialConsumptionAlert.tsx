import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Item } from "@/lib/types";

export interface MaterialConsumption {
  materialId: string;
  quantity: number;
}

interface MaterialConsumptionAlertProps {
  consumption: MaterialConsumption[];
  items: Item[];
  getInventory: (itemId: string, date?: string) => number;
  currentDate?: string;
}

export function MaterialConsumptionAlert({
  consumption,
  items,
  getInventory,
  currentDate,
}: MaterialConsumptionAlertProps) {
  // 성능 최적화: items를 Map으로 캐싱 (Codex 리뷰 반영)
  const itemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  // Check for inventory shortages - useMemo로 캐싱 (Codex 리뷰 반영)
  const shortages = useMemo(() => consumption
    .map(c => {
      const material = itemsMap.get(c.materialId);
      const rawInventory = getInventory(c.materialId, currentDate);
      // NaN/undefined 방어 (Codex 리뷰 반영)
      const currentInventory = Number.isFinite(rawInventory) ? rawInventory : 0;
      const hasShortage = c.quantity > currentInventory;

      return {
        materialId: c.materialId,
        materialName: material?.name || c.materialId,
        unit: material?.unit || "ea",
        required: c.quantity,
        current: currentInventory,
        hasShortage,
      };
    })
    .sort((a, b) => {
      // Sort shortages first
      if (a.hasShortage && !b.hasShortage) return -1;
      if (!a.hasShortage && b.hasShortage) return 1;
      return 0;
    }), [consumption, itemsMap, getInventory, currentDate]);

  const hasAnyShortage = shortages.some(s => s.hasShortage);

  if (consumption.length === 0) {
    return null;
  }

  return (
    // 스크린리더 지원 강화 (Codex 리뷰 반영)
    <Alert variant={hasAnyShortage ? "destructive" : "default"} role="status" aria-live="polite">
      {hasAnyShortage ? (
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      ) : (
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
      )}
      <AlertTitle>
        {hasAnyShortage ? "재고 부족 - 생산 불가" : "BOM 소모 자재 확인"}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          {shortages.map((item) => (
            <div
              key={item.materialId}
              className={`flex items-center justify-between text-sm ${
                item.hasShortage ? "font-semibold" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                {item.hasShortage && (
                  <AlertCircle className="h-3 w-3" />
                )}
                {item.materialName}
              </span>
              <span className={item.hasShortage ? "text-destructive" : ""}>
                필요: {item.required.toFixed(2)} {item.unit} /
                현재: {item.current.toFixed(2)} {item.unit}
                {item.hasShortage && (
                  <span className="ml-2 text-xs">
                    (부족: {(item.required - item.current).toFixed(2)} {item.unit})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
        {hasAnyShortage && (
          <p className="mt-3 text-xs">
            위 자재의 재고가 부족하여 생산을 진행할 수 없습니다. 먼저 자재를 입고하거나 생산 수량을 조정해주세요.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
