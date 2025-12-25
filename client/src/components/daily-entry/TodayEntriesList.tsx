import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction, Item, Partner, TransactionType } from "@/lib/types";
import { format } from "date-fns";
import { FileText, Package, Factory, Truck, Recycle, ListFilter } from "lucide-react";

interface TodayEntriesListProps {
  transactions: Transaction[];
  items: Item[];
  partners: Partner[];
  selectedDate: string;
}

const TX_TYPE_LABELS: Record<TransactionType, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PURCHASE_RECEIPT: { label: "입고", variant: "default" },
  PRODUCTION_PRESS: { label: "프레스", variant: "secondary" },
  PRODUCTION_WELD: { label: "용접", variant: "secondary" },
  PRODUCTION_PAINT: { label: "도장", variant: "secondary" },
  SHIPMENT: { label: "출고", variant: "outline" },
  SCRAP_SHIPMENT: { label: "스크랩", variant: "destructive" },
  ADJUSTMENT: { label: "조정", variant: "outline" },
  TRANSFER: { label: "이동", variant: "outline" },
};

type FilterType = "all" | "receipt" | "production" | "shipment" | "scrap";

const FILTER_BUTTONS: { type: FilterType; label: string; icon: React.ReactNode; txTypes: TransactionType[] }[] = [
  { type: "all", label: "전체", icon: <ListFilter className="h-3.5 w-3.5" />, txTypes: [] },
  { type: "receipt", label: "입고", icon: <Package className="h-3.5 w-3.5" />, txTypes: ["PURCHASE_RECEIPT"] },
  { type: "production", label: "생산", icon: <Factory className="h-3.5 w-3.5" />, txTypes: ["PRODUCTION_PRESS", "PRODUCTION_WELD", "PRODUCTION_PAINT"] },
  { type: "shipment", label: "출고", icon: <Truck className="h-3.5 w-3.5" />, txTypes: ["SHIPMENT"] },
  { type: "scrap", label: "스크랩", icon: <Recycle className="h-3.5 w-3.5" />, txTypes: ["SCRAP_SHIPMENT"] },
];

export function TodayEntriesList({
  transactions,
  items,
  partners,
  selectedDate,
}: TodayEntriesListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const todayTransactions = useMemo(() => {
    return transactions
      .filter((tx) => tx.date === selectedDate)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, selectedDate]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === "all") return todayTransactions;
    const filterConfig = FILTER_BUTTONS.find(f => f.type === activeFilter);
    if (!filterConfig) return todayTransactions;
    return todayTransactions.filter(tx => filterConfig.txTypes.includes(tx.type));
  }, [todayTransactions, activeFilter]);

  // 각 필터별 건수 계산
  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: todayTransactions.length,
      receipt: 0,
      production: 0,
      shipment: 0,
      scrap: 0,
    };
    todayTransactions.forEach(tx => {
      if (tx.type === "PURCHASE_RECEIPT") counts.receipt++;
      else if (["PRODUCTION_PRESS", "PRODUCTION_WELD", "PRODUCTION_PAINT"].includes(tx.type)) counts.production++;
      else if (tx.type === "SHIPMENT") counts.shipment++;
      else if (tx.type === "SCRAP_SHIPMENT") counts.scrap++;
    });
    return counts;
  }, [todayTransactions]);

  const getItem = (itemId: string) => items.find((i) => i.id === itemId);
  const getPartner = (partnerId?: string) =>
    partnerId ? partners.find((p) => p.id === partnerId) : null;

  if (todayTransactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {selectedDate} 거래 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            해당 날짜에 등록된 거래가 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {selectedDate} 거래 내역
            <Badge variant="secondary" className="ml-2">
              {filteredTransactions.length}건
            </Badge>
          </CardTitle>
        </div>

        {/* 필터 버튼 그룹 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {FILTER_BUTTONS.map((filter) => (
            <Button
              key={filter.type}
              variant={activeFilter === filter.type ? "default" : "outline"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setActiveFilter(filter.type)}
            >
              {filter.icon}
              <span className="ml-1.5">{filter.label}</span>
              <Badge
                variant={activeFilter === filter.type ? "secondary" : "outline"}
                className={`ml-1.5 h-5 px-1.5 text-[10px] ${
                  activeFilter === filter.type
                    ? "bg-white/20 text-white border-0"
                    : "bg-muted"
                }`}
              >
                {filterCounts[filter.type]}
              </Badge>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[90px] text-center font-semibold">유형</TableHead>
                <TableHead className="text-center font-semibold">품목</TableHead>
                <TableHead className="w-[120px] text-center font-semibold">수량</TableHead>
                <TableHead className="text-center font-semibold">거래처</TableHead>
                <TableHead className="w-[80px] text-center font-semibold">시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    해당 유형의 거래가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const typeInfo = TX_TYPE_LABELS[tx.type];
                  const partner = getPartner(tx.partnerId);
                  const mainLine = tx.lines?.[0];
                  const mainItem = mainLine ? getItem(mainLine.itemId) : null;

                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="text-center py-3">
                        <Badge variant={typeInfo.variant} className="min-w-[60px] justify-center">
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {mainItem ? (
                          <span className="font-medium">
                            {mainItem.name}
                            {tx.lines && tx.lines.length > 1 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                외 {tx.lines.length - 1}건
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <span className="font-mono font-medium">
                          {mainLine ? Math.abs(Number(mainLine.quantity)).toLocaleString() : "-"}
                        </span>
                        {mainItem && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {mainItem.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3 text-muted-foreground">
                        {partner?.name || "-"}
                      </TableCell>
                      <TableCell className="text-center py-3 text-xs text-muted-foreground font-mono">
                        {format(new Date(tx.createdAt), "HH:mm")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
