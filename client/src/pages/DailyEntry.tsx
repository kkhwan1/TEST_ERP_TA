import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { ProcessType } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TransactionTypeSelector,
  TransactionMode,
  ItemCombobox,
  LineItemEditor,
  LineItem,
  BomPreviewTable,
  TodayEntriesList,
  MaterialConsumptionAlert,
} from "@/components/daily-entry";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useItems,
  usePartners,
  useBomHeaders,
  useCreateTransaction,
  useTransactions,
  useMonthlyPrices,
  useMonthlyPriceStatus,
  useSnapshot,
  useInventory,
  type TransactionWithLines,
} from "@/lib/api";
import type { InsertTransaction, InsertTxLine } from "@shared/schema";

// Helper function to calculate BOM consumption
function calculateConsumption(
  itemId: string,
  qty: number,
  month: string,
  process: ProcessType,
  boms: any[]
): { materialId: string; quantity: number }[] {
  const bom = boms.find((b: any) => b.itemId === itemId && b.version === month);
  if (!bom || !bom.lines) return [];

  return bom.lines
    .filter((l: any) => !l.process || l.process === process)
    .map((l: any) => ({
      materialId: l.materialId,
      quantity: l.quantity * qty,
    }));
}

// Helper function to check if BOM is fixed
function isBomFixed(itemId: string, month: string, boms: any[]): boolean {
  const bom = boms.find(b => b.itemId === itemId && b.version === month);
  return bom?.isFixed ?? false;
}

// Helper function to check inventory availability
function checkInventoryAvailable(
  itemId: string,
  requiredQty: number,
  currentQty: number
): boolean {
  return currentQty >= requiredQty;
}

// Helper function to check process sequence
function checkProcessSequence(
  itemId: string,
  targetProcess: ProcessType,
  items: any[],
  boms: any[],
  getInventoryFn: (id: string) => number,
  currentMonth: string
): { valid: boolean; message?: string; missingProcess?: ProcessType } {
  if (targetProcess === 'PRESS' || targetProcess === 'NONE') {
    return { valid: true };
  }

  const item = items.find(i => i.id === itemId);
  if (!item) {
    return { valid: false, message: '품목을 찾을 수 없습니다.' };
  }

  const bom = boms.find(b => b.itemId === itemId && b.version === currentMonth);
  if (!bom || !bom.lines || bom.lines.length === 0) {
    return { valid: false, message: 'BOM이 등록되지 않았습니다.' };
  }

  if (targetProcess === 'WELD') {
    for (const line of bom.lines) {
      const material = items.find(i => i.id === line.materialId);
      if (material && material.process === 'PRESS') {
        const inventory = getInventoryFn(line.materialId);
        if (inventory <= 0) {
          return {
            valid: false,
            missingProcess: 'PRESS',
            message: `공정 순서 오류: 프레스 공정 완료 후 진행하세요 (${material.name} 재고 부족)`
          };
        }
      }
    }
    return { valid: true };
  }

  if (targetProcess === 'PAINT') {
    for (const line of bom.lines) {
      const material = items.find(i => i.id === line.materialId);
      if (material && material.process === 'WELD') {
        const inventory = getInventoryFn(line.materialId);
        if (inventory <= 0) {
          return {
            valid: false,
            missingProcess: 'WELD',
            message: `공정 순서 오류: 용접 공정 완료 후 진행하세요 (${material.name} 재고 부족)`
          };
        }
      }
    }
    return { valid: true };
  }

  return { valid: true };
}

export default function DailyEntry() {
  const { toast } = useToast();

  // TanStack Query hooks
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: partners = [], isLoading: partnersLoading } = usePartners();
  const createTransactionMutation = useCreateTransaction();

  // Transaction Type
  const [mode, setMode] = useState<TransactionMode>("production");

  // Common Form State
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [partnerId, setPartnerId] = useState("");
  const [remarks, setRemarks] = useState("");

  // Lines for Receipt/Shipment
  const [lines, setLines] = useState<LineItem[]>([]);

  // Production State
  const [process, setProcess] = useState<ProcessType>("PRESS");
  const [prodItemId, setProdItemId] = useState("");
  const [prodQty, setProdQty] = useState<number>(0);
  const [weldPreview, setWeldPreview] = useState<{ materialId: string; quantity: number }[] | null>(null);

  // Scrap State
  const [scrapItemId, setScrapItemId] = useState("");
  const [scrapWeight, setScrapWeight] = useState<number>(0);
  const [scrapPrice, setScrapPrice] = useState<number>(0);

  // Derived Values
  const currentMonth = date.substring(0, 7);

  // Query for current month's BOM, prices, and snapshot
  const { data: monthlyBoms = [] } = useBomHeaders(currentMonth);
  const { data: monthlyPrices = [] } = useMonthlyPrices(currentMonth);
  const { data: priceStatus } = useMonthlyPriceStatus(currentMonth);
  const { data: snapshot } = useSnapshot(currentMonth);

  const monthClosed = snapshot?.status === 'CLOSED';
  const pricesFixed = priceStatus?.isFixed ?? false;

  // Inventory cache for checking availability
  const [inventoryCache, setInventoryCache] = useState<Record<string, number>>({});

  // Query for today's transactions
  const { data: transactionsData = [] } = useTransactions({
    startDate: date,
    endDate: date,
  });

  // Convert TransactionWithLines to Transaction format for TodayEntriesList
  // Handle both snake_case (Supabase) and camelCase formats
  const todayTransactions = useMemo(() => {
    return transactionsData.map((tx: any) => ({
      id: tx.id.toString(),
      date: tx.date,
      type: tx.type as any,
      partnerId: (tx.partner_id || tx.partnerId)?.toString(),
      remarks: tx.remarks || undefined,
      lines: (tx.lines || []).map((line: any) => ({
        id: line.id.toString(),
        itemId: (line.item_id || line.itemId)?.toString(),
        quantity: parseFloat(line.quantity),
        price: line.price ? parseFloat(line.price) : undefined,
        amount: line.amount ? parseFloat(line.amount) : undefined,
      })),
      createdAt: (tx.created_at || tx.createdAt) ? new Date(tx.created_at || tx.createdAt).toISOString() : new Date().toISOString(),
    }));
  }, [transactionsData]);

  // Filtered Items by mode
  const filteredItems = useMemo(() => {
    switch (mode) {
      case "receipt":
        return items.filter((i) => i.source === "BUY");
      case "production":
        return items.filter((i) => i.process === process);
      case "shipment":
        return items.filter((i) => i.type === "PRODUCT");
      case "scrap":
        return items.filter((i) => i.type === "SCRAP");
      default:
        return items;
    }
  }, [items, mode, process]);

  // Filtered Partners by mode
  const filteredPartners = useMemo(() => {
    switch (mode) {
      case "receipt":
        return partners.filter((p) => p.type === "VENDOR" || p.type === "BOTH");
      case "shipment":
      case "scrap":
        return partners.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");
      default:
        return partners;
    }
  }, [partners, mode]);

  // Convert partner IDs to strings for select components
  const partnerOptions = useMemo(() => {
    return filteredPartners.map(p => ({
      ...p,
      id: p.id.toString()
    }));
  }, [filteredPartners]);

  // Helper to get inventory (with caching)
  const getInventory = (itemId: string, dateStr?: string): number => {
    return inventoryCache[itemId] ?? 0;
  };

  // Helper to get monthly price
  const getMonthlyPrice = (itemId: string, type: "PURCHASE" | "SALES") => {
    if (!pricesFixed) return 0;
    const price = monthlyPrices.find(
      p => p.itemId === itemId && p.month === currentMonth && p.type === type
    );
    return price?.price ?? 0;
  };

  // Apply monthly price when item selected
  const applyMonthlyPrice = (itemId: string, type: "PURCHASE" | "SALES") => {
    return getMonthlyPrice(itemId, type);
  };

  // Generate unique line ID
  const generateLineItemId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle item selection with auto price
  const handleLineItemChange = (newLines: LineItem[]) => {
    const updatedLines = newLines.map((line) => {
      const prevLine = lines.find(l => l.id === line.id);
      // Only update price if item changed and price is 0
      if (line.itemId && line.itemId !== prevLine?.itemId && line.price === 0) {
        const priceType = mode === "receipt" ? "PURCHASE" : "SALES";
        const autoPrice = applyMonthlyPrice(line.itemId, priceType);
        return { ...line, price: autoPrice };
      }
      return line;
    });
    setLines(updatedLines);
  };

  // Initialize empty lines with id
  const initEmptyLine = (): LineItem => ({
    id: generateLineItemId(),
    itemId: "",
    quantity: 0,
    price: 0,
  });

  const resetForm = () => {
    setLines([]);
    setRemarks("");
    setProdQty(0);
    setProdItemId("");
    setWeldPreview(null);
    setScrapItemId("");
    setScrapWeight(0);
    setScrapPrice(0);
  };

  // Validation for closed month
  const validateMonth = () => {
    if (monthClosed) {
      toast({
        variant: "destructive",
        title: "마감된 월입니다",
        description: "이미 마감된 월에는 전표를 등록할 수 없습니다.",
      });
      return false;
    }
    return true;
  };

  // === RECEIPT ===
  const handleSubmitReceipt = async () => {
    if (!validateMonth()) return;
    if (!partnerId || lines.length === 0) {
      toast({ variant: "destructive", title: "거래처와 품목을 입력해주세요" });
      return;
    }

    const transaction: InsertTransaction = {
      date,
      type: "PURCHASE_RECEIPT",
      partnerId,
      remarks: remarks || null,
    };

    // Filter out empty lines (no itemId selected)
    const validLines = lines.filter(l => l.itemId && l.itemId.trim() !== "");
    if (validLines.length === 0) {
      toast({ variant: "destructive", title: "품목을 선택해주세요" });
      return;
    }

    const txLines = validLines.map((l) => ({
      itemId: l.itemId,
      quantity: l.quantity.toString(),
      price: l.price.toString(),
      amount: (l.quantity * l.price).toString(),
    })) as Omit<InsertTxLine, 'transactionId'>[];

    try {
      await createTransactionMutation.mutateAsync({
        transaction,
        lines: txLines as any,
      });
      toast({ title: "입고 등록 완료", description: `${validLines.length}개 품목이 입고되었습니다.` });
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "입고 등록 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  // === SHIPMENT ===
  const handleSubmitShipment = async () => {
    if (!validateMonth()) return;

    // Filter out empty lines (no itemId selected)
    const validLines = lines.filter(l => l.itemId && l.itemId.trim() !== "");
    if (!partnerId || validLines.length === 0) {
      toast({ variant: "destructive", title: "거래처와 품목을 입력해주세요" });
      return;
    }

    // Phase 6: Check inventory availability for each line item
    for (const line of validLines) {
      const item = items.find(i => i.id === line.itemId);
      const currentQty = getInventory(line.itemId, date);

      if (!checkInventoryAvailable(line.itemId, line.quantity, currentQty)) {
        toast({
          variant: "destructive",
          title: "재고 부족",
          description: `${item?.name || line.itemId} (필요: ${line.quantity}, 현재: ${currentQty})`,
        });
        return;
      }
    }

    const transaction: InsertTransaction = {
      date,
      type: "SHIPMENT",
      partnerId,
      remarks: remarks || null,
    };

    const txLines = validLines.map((l) => ({
      itemId: l.itemId,
      quantity: (-l.quantity).toString(), // Negative for outbound
      price: l.price.toString(),
      amount: (l.quantity * l.price).toString(),
    })) as Omit<InsertTxLine, 'transactionId'>[];

    try {
      await createTransactionMutation.mutateAsync({
        transaction,
        lines: txLines as any,
      });
      toast({ title: "출고 등록 완료", description: `${validLines.length}개 품목이 출고되었습니다.` });
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "출고 등록 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  // === PRODUCTION ===
  const handleCheckWeld = () => {
    if (!prodItemId || prodQty <= 0) return;
    const consumption = calculateConsumption(prodItemId, prodQty, currentMonth, 'WELD', monthlyBoms);
    setWeldPreview(consumption);
  };

  // Calculate consumption preview for current production settings
  const currentConsumption = useMemo(() => {
    if (!prodItemId || prodQty <= 0) return [];
    return calculateConsumption(prodItemId, prodQty, currentMonth, process, monthlyBoms);
  }, [prodItemId, prodQty, currentMonth, process, monthlyBoms]);

  const handleSubmitProduction = async () => {
    if (!validateMonth()) return;
    if (!prodItemId || prodQty <= 0) {
      toast({ variant: "destructive", title: "품목과 수량을 입력해주세요" });
      return;
    }

    // Phase 2: BOM validation for PRESS/WELD/PAINT
    if ((process === "PRESS" || process === "WELD" || process === "PAINT") &&
        !isBomFixed(prodItemId, currentMonth, monthlyBoms)) {
      toast({
        variant: "destructive",
        title: "BOM이 확정되지 않았습니다",
        description: "생산 전 해당 월의 BOM을 먼저 확정해주세요.",
      });
      return;
    }

    // Phase 6.5: Process sequence validation
    if (process === 'PRESS' || process === 'WELD' || process === 'PAINT') {
      const sequenceCheck = checkProcessSequence(
        prodItemId,
        process,
        items,
        monthlyBoms,
        getInventory,
        currentMonth
      );
      if (!sequenceCheck.valid) {
        toast({
          variant: "destructive",
          title: "공정 순서 오류",
          description: sequenceCheck.message || "이전 공정을 먼저 완료해주세요.",
        });
        return;
      }
    }

    // Phase 6: Check material inventory availability
    const consumption = calculateConsumption(prodItemId, prodQty, currentMonth, process, monthlyBoms);

    // Validate inventory for consumption materials
    for (const item of consumption) {
      const material = items.find(i => i.id === item.materialId);
      const currentQty = getInventory(item.materialId, date);

      if (!checkInventoryAvailable(item.materialId, item.quantity, currentQty)) {
        toast({
          variant: "destructive",
          title: "재고 부족",
          description: `${material?.name || item.materialId} (필요: ${item.quantity}, 현재: ${currentQty})`,
        });
        return;
      }
    }

    let type: "PRODUCTION_PRESS" | "PRODUCTION_WELD" | "PRODUCTION_PAINT" = "PRODUCTION_PRESS";
    if (process === "WELD") type = "PRODUCTION_WELD";
    if (process === "PAINT") type = "PRODUCTION_PAINT";

    const transaction: InsertTransaction = {
      date,
      type,
      remarks: remarks || null,
    };

    // 생산 라인만 전송 (차감 라인은 백엔드에서 자동 생성)
    const txLines = [
      {
        itemId: prodItemId,
        quantity: prodQty.toString(),
      },
    ] as Omit<InsertTxLine, 'transactionId'>[];

    // NOTE: 차감 라인은 백엔드에서 BOM 기반으로 자동 생성됨
    // Backend automatically generates consumption lines from BOM for PRODUCTION_WELD and PRODUCTION_PAINT

    try {
      await createTransactionMutation.mutateAsync({
        transaction,
        lines: txLines as any,
      });
      const itemName = items.find((i) => i.id === prodItemId)?.name || prodItemId;
      toast({
        title: "생산 실적 등록 완료",
        description: `${itemName} ${prodQty}개 생산`,
      });
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "생산 실적 등록 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  // === SCRAP ===
  const handleSubmitScrap = async () => {
    if (!validateMonth()) return;
    if (!partnerId || !scrapItemId || scrapWeight <= 0) {
      toast({ variant: "destructive", title: "거래처, 품목, 중량을 입력해주세요" });
      return;
    }

    // Phase 6: Check scrap inventory availability
    const scrapItem = items.find(i => i.id === scrapItemId);
    const currentQty = getInventory(scrapItemId, date);

    if (!checkInventoryAvailable(scrapItemId, scrapWeight, currentQty)) {
      toast({
        variant: "destructive",
        title: "재고 부족",
        description: `${scrapItem?.name || scrapItemId} (필요: ${scrapWeight}, 현재: ${currentQty})`,
      });
      return;
    }

    const transaction: InsertTransaction = {
      date,
      type: "SCRAP_SHIPMENT",
      partnerId,
      remarks: remarks || null,
    };

    const txLines = [
      {
        itemId: scrapItemId,
        quantity: (-scrapWeight).toString(), // Negative for outbound
        price: scrapPrice.toString(),
        amount: (scrapWeight * scrapPrice).toString(),
      },
    ] as Omit<InsertTxLine, 'transactionId'>[];

    try {
      await createTransactionMutation.mutateAsync({
        transaction,
        lines: txLines as any,
      });
      toast({
        title: "스크랩 반출 완료",
        description: `${scrapWeight}kg 반출, 예상 금액: ${(scrapWeight * scrapPrice).toLocaleString()}원`,
      });
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "스크랩 반출 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  // Loading state
  const isLoading = itemsLoading || partnersLoading || createTransactionMutation.isPending;

  return (
    <AppLayout title="일일 전표 입력">
      <div className="space-y-6">
        {/* Month Closed Warning */}
        {monthClosed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{currentMonth}</strong> 월은 이미 마감되었습니다. 전표를 등록할 수 없습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* Transaction Type Selector */}
        <TransactionTypeSelector value={mode} onChange={setMode} />

        {/* Date & Common Fields */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>일자</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              {(mode === "receipt" || mode === "shipment" || mode === "scrap") && (
                <div className="space-y-2">
                  <Label>거래처 <span className="text-red-500">*</span></Label>
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="거래처 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "production" && (
                <div className="space-y-2">
                  <Label>공정</Label>
                  <Select
                    value={process}
                    onValueChange={(val: ProcessType) => {
                      setProcess(val);
                      setProdItemId("");
                      setWeldPreview(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESS">프레스 (Press)</SelectItem>
                      <SelectItem value="WELD">용접 (Weld)</SelectItem>
                      <SelectItem value="PAINT">도장 (Paint)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>비고</Label>
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="특이사항 입력" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === RECEIPT FORM === */}
        {mode === "receipt" && (
          <Card>
            <CardHeader>
              <CardTitle>구매/외주 입고</CardTitle>
              <CardDescription>원재료, 부자재, 사급자재 입고 내역을 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <LineItemEditor
                lines={lines}
                items={filteredItems}
                onChange={handleLineItemChange}
                priceLabel="매입단가"
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={handleSubmitReceipt}
                disabled={isLoading || monthClosed || !partnerId || lines.length === 0}
              >
                입고 확정
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* === PRODUCTION FORM === */}
        {mode === "production" && (
          <Card>
            <CardHeader>
              <CardTitle>생산 실적 등록</CardTitle>
              <CardDescription>공정별 생산량을 입력합니다. 프레스/용접/도장 공정은 BOM 차감이 자동 계산됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-muted/30 rounded-lg border space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>생산 품목</Label>
                    <ItemCombobox
                      items={filteredItems}
                      value={prodItemId}
                      onChange={(val) => {
                        setProdItemId(val);
                        setWeldPreview(null);
                      }}
                      placeholder="생산한 품목 선택"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      생산 수량 ({prodItemId ? items.find((i) => i.id === prodItemId)?.unit || "ea" : "ea"})
                    </Label>
                    <Input
                      type="number"
                      value={prodQty || ""}
                      onChange={(e) => setProdQty(Number(e.target.value))}
                      min="0"
                    />
                  </div>
                </div>

                {/* BOM Preview for WELD */}
                {process === "WELD" && prodItemId && prodQty > 0 && (
                  <BomPreviewTable
                    preview={weldPreview}
                    items={items}
                    onCalculate={handleCheckWeld}
                    disabled={!prodItemId || prodQty <= 0}
                  />
                )}
              </div>

              {/* Material Consumption Alert */}
              {prodItemId && prodQty > 0 && currentConsumption.length > 0 && (
                <MaterialConsumptionAlert
                  consumption={currentConsumption}
                  items={items}
                  getInventory={getInventory}
                  currentDate={date}
                />
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={handleSubmitProduction}
                disabled={isLoading || monthClosed || !prodItemId || prodQty <= 0 || (process === "WELD" && !weldPreview)}
                className="w-full sm:w-auto"
              >
                <Check className="mr-2 h-4 w-4" /> 생산 실적 확정
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* === SHIPMENT FORM === */}
        {mode === "shipment" && (
          <Card>
            <CardHeader>
              <CardTitle>제품 납품 (출고)</CardTitle>
              <CardDescription>고객사 납품 내역을 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <LineItemEditor
                lines={lines}
                items={filteredItems}
                onChange={handleLineItemChange}
                priceLabel="매출단가"
                getInventory={getInventory}
                currentDate={date}
                mode="shipment"
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={handleSubmitShipment}
                disabled={isLoading || monthClosed || !partnerId || lines.length === 0}
              >
                출고 확정
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* === SCRAP FORM === */}
        {mode === "scrap" && (
          <Card>
            <CardHeader>
              <CardTitle>스크랩 반출</CardTitle>
              <CardDescription>스크랩 반출 내역을 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>스크랩 품목</Label>
                  <ItemCombobox
                    items={filteredItems}
                    value={scrapItemId}
                    onChange={setScrapItemId}
                    placeholder="스크랩 선택"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    중량 (kg)
                    {scrapItemId && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (현재고: {getInventory(scrapItemId, date).toFixed(2)} kg)
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={scrapWeight || ""}
                    onChange={(e) => setScrapWeight(Number(e.target.value))}
                    min="0"
                    step="0.1"
                    className={cn(
                      scrapItemId && scrapWeight > 0 && scrapWeight > getInventory(scrapItemId, date) &&
                      "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>단가 (원/kg)</Label>
                  <Input
                    type="number"
                    value={scrapPrice || ""}
                    onChange={(e) => setScrapPrice(Number(e.target.value))}
                    min="0"
                  />
                </div>
              </div>

              {/* Inventory shortage warning for scrap */}
              {scrapItemId && scrapWeight > 0 && scrapWeight > getInventory(scrapItemId, date) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">
                      {items.find(i => i.id === scrapItemId)?.name}
                    </span>{" "}
                    재고 부족: 필요{" "}
                    <span className="font-semibold">{scrapWeight.toFixed(2)} kg</span>, 현재{" "}
                    <span className="font-semibold">{getInventory(scrapItemId, date).toFixed(2)} kg</span>
                  </AlertDescription>
                </Alert>
              )}

              {scrapWeight > 0 && scrapPrice > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">예상 금액</span>
                    <span className="text-xl font-bold">{(scrapWeight * scrapPrice).toLocaleString()}원</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={handleSubmitScrap}
                disabled={isLoading || monthClosed || !partnerId || !scrapItemId || scrapWeight <= 0}
              >
                스크랩 반출 확정
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Today's Entries List */}
        <TodayEntriesList transactions={todayTransactions} items={items} partners={partners} selectedDate={date} />
      </div>
    </AppLayout>
  );
}
