import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTransactions, useItems, usePartners } from "@/lib/api";
import { useState, useMemo } from "react";
import { TransactionType, TRANSACTION_TYPE_LABELS } from "@/lib/types";
import { format, subMonths } from "date-fns";
import { Download, Search, FileText, Loader2, ListFilter, Package, Factory, Truck, Recycle, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Transactions() {
  const { data: transactionsData, isLoading: isLoadingTxs } = useTransactions();
  const { data: items = [], isLoading: isLoadingItems } = useItems();
  const { data: partners = [], isLoading: isLoadingPartners } = usePartners();

  const transactions = useMemo(() => {
    if (!transactionsData) return [];
    // Convert backend format to frontend format (snake_case to camelCase)
    return transactionsData.map(tx => ({
      id: tx.id,
      date: tx.date,
      type: tx.type as TransactionType,
      partnerId: tx.partner_id ?? undefined,
      remarks: tx.remarks || "",
      lines: (tx.lines || []).map(line => ({
        itemId: line.item_id,
        quantity: line.quantity,
        price: line.price ?? undefined,
        amount: line.amount ?? undefined,
      })),
    }));
  }, [transactionsData]);

  const isLoading = isLoadingTxs || isLoadingItems || isLoadingPartners;

  // 필터 상태 (기본 1년 범위로 설정)
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 12), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [itemFilter, setItemFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState<string>("ALL");

  // 필터 버튼 정의
  type FilterType = "all" | "receipt" | "production" | "shipment" | "scrap" | "adjustment";

  const FILTER_BUTTONS: { type: FilterType; label: string; icon: React.ReactNode; txTypes: TransactionType[] }[] = [
    { type: "all", label: "전체", icon: <ListFilter className="h-3.5 w-3.5" />, txTypes: [] },
    { type: "receipt", label: "입고", icon: <Package className="h-3.5 w-3.5" />, txTypes: ["PURCHASE_RECEIPT"] },
    { type: "production", label: "생산", icon: <Factory className="h-3.5 w-3.5" />, txTypes: ["PRODUCTION_PRESS", "PRODUCTION_WELD", "PRODUCTION_PAINT"] },
    { type: "shipment", label: "출고", icon: <Truck className="h-3.5 w-3.5" />, txTypes: ["SHIPMENT"] },
    { type: "scrap", label: "스크랩", icon: <Recycle className="h-3.5 w-3.5" />, txTypes: ["SCRAP_SHIPMENT"] },
    { type: "adjustment", label: "조정", icon: <Settings className="h-3.5 w-3.5" />, txTypes: ["ADJUSTMENT", "TRANSFER"] },
  ];

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // 기본 필터링 (날짜, 거래처, 품목)
  const baseFilteredTxs = useMemo(() => {
    return transactions
      .filter((tx) => {
        // 기간 필터
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
        // 거래처 필터
        if (partnerFilter !== "ALL" && tx.partnerId?.toString() !== partnerFilter) return false;
        // 품목 필터 (품목명으로 검색)
        if (itemFilter.trim()) {
          const hasMatchingItem = tx.lines.some((line) => {
            const item = items.find((i) => i.id === line.itemId);
            return item?.name.toLowerCase().includes(itemFilter.toLowerCase()) ||
                   item?.code.toLowerCase().includes(itemFilter.toLowerCase());
          });
          if (!hasMatchingItem) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // 최신순
  }, [transactions, startDate, endDate, partnerFilter, itemFilter, items]);

  // 각 필터별 건수 계산
  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: baseFilteredTxs.length,
      receipt: 0,
      production: 0,
      shipment: 0,
      scrap: 0,
      adjustment: 0,
    };
    baseFilteredTxs.forEach(tx => {
      if (tx.type === "PURCHASE_RECEIPT") counts.receipt++;
      else if (["PRODUCTION_PRESS", "PRODUCTION_WELD", "PRODUCTION_PAINT"].includes(tx.type)) counts.production++;
      else if (tx.type === "SHIPMENT") counts.shipment++;
      else if (tx.type === "SCRAP_SHIPMENT") counts.scrap++;
      else if (["ADJUSTMENT", "TRANSFER"].includes(tx.type)) counts.adjustment++;
    });
    return counts;
  }, [baseFilteredTxs]);

  // 거래유형 필터 적용
  const filteredTxs = useMemo(() => {
    if (activeFilter === "all") return baseFilteredTxs;
    const filterConfig = FILTER_BUTTONS.find(f => f.type === activeFilter);
    if (!filterConfig) return baseFilteredTxs;
    return baseFilteredTxs.filter(tx => filterConfig.txTypes.includes(tx.type));
  }, [baseFilteredTxs, activeFilter]);

  // 플랫 데이터 (각 line을 행으로 펼침)
  const flattenedData = useMemo(() => {
    const rows: {
      txId: string;
      date: string;
      type: TransactionType;
      typeName: string;
      partnerName: string;
      itemCode: string;
      itemName: string;
      quantity: number;
      unit: string;
      price: number;
      amount: number;
      remarks: string;
    }[] = [];

    filteredTxs.forEach((tx) => {
      const partner = partners.find((p) => p.id === tx.partnerId);
      tx.lines.forEach((line) => {
        const item = items.find((i) => i.id === line.itemId);
        rows.push({
          txId: tx.id.toString(),
          date: tx.date,
          type: tx.type,
          typeName: TRANSACTION_TYPE_LABELS[tx.type] || tx.type,
          partnerName: partner?.name || "-",
          itemCode: item?.code || "",
          itemName: item?.name || line.itemId.toString(),
          quantity: line.quantity,
          unit: item?.unit || "ea",
          price: line.price || 0,
          amount: line.amount || 0,
          remarks: tx.remarks || "",
        });
      });
    });

    return rows;
  }, [filteredTxs, items, partners]);

  // 합계 계산
  const totalAmount = useMemo(() => {
    return flattenedData.reduce((sum, row) => sum + row.amount, 0);
  }, [flattenedData]);

  // CSV 다운로드
  const handleDownloadCSV = () => {
    const headers = ["일자", "거래유형", "거래처", "품목코드", "품목명", "수량", "단위", "단가", "금액", "비고"];
    const csvRows = [
      headers.join(","),
      ...flattenedData.map((row) =>
        [
          row.date,
          row.typeName,
          row.partnerName,
          row.itemCode,
          `"${row.itemName}"`,
          row.quantity,
          row.unit,
          row.price,
          row.amount,
          `"${row.remarks}"`,
        ].join(",")
      ),
    ];

    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `거래내역_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AppLayout title="거래내역 조회" actions={<PrintButton />}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="거래내역 조회"
      actions={<PrintButton />}
    >
      <div className="space-y-6">
        {/* 필터 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              조회 조건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>거래처</Label>
                <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>품목 검색</Label>
                <Input
                  value={itemFilter}
                  onChange={(e) => setItemFilter(e.target.value)}
                  placeholder="품목명/코드 검색"
                />
              </div>
            </div>

            {/* 거래유형 필터 버튼 그룹 */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <Label className="w-full text-sm text-muted-foreground mb-1">거래유형</Label>
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

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleDownloadCSV} disabled={flattenedData.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                CSV 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 요약 정보 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">전표 수</div>
              <div className="text-2xl font-bold">{filteredTxs.length}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">라인 수</div>
              <div className="text-2xl font-bold">{flattenedData.length}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">총 금액</div>
              <div className="text-2xl font-bold">{totalAmount.toLocaleString()}원</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">조회 기간</div>
              <div className="text-lg font-medium">
                {startDate} ~ {endDate}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 거래내역 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              거래내역 ({flattenedData.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flattenedData.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                조회 조건에 맞는 거래내역이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] text-center">일자</TableHead>
                      <TableHead className="w-[100px] text-center">거래유형</TableHead>
                      <TableHead className="text-center">거래처</TableHead>
                      <TableHead className="w-[100px] text-center">품목코드</TableHead>
                      <TableHead className="text-center">품목명</TableHead>
                      <TableHead className="text-center w-[100px]">수량</TableHead>
                      <TableHead className="text-center w-[100px]">단가</TableHead>
                      <TableHead className="text-center w-[120px]">금액</TableHead>
                      <TableHead className="text-center">비고</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flattenedData.map((row, idx) => (
                      <TableRow key={`${row.txId}-${idx}`}>
                        <TableCell className="font-mono text-center">{row.date}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              row.type === "PURCHASE_RECEIPT"
                                ? "bg-blue-100 text-blue-800"
                                : row.type === "SHIPMENT"
                                ? "bg-green-100 text-green-800"
                                : row.type === "SCRAP_SHIPMENT"
                                ? "bg-orange-100 text-orange-800"
                                : row.type.startsWith("PRODUCTION_")
                                ? "bg-purple-100 text-purple-800"
                                : row.type === "ADJUSTMENT"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {row.typeName}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{row.partnerName}</TableCell>
                        <TableCell className="font-mono text-center text-muted-foreground">{row.itemCode}</TableCell>
                        <TableCell className="text-center">{row.itemName}</TableCell>
                        <TableCell className={`text-center font-mono ${row.quantity < 0 ? "text-red-600" : ""}`}>
                          {row.quantity.toLocaleString()} {row.unit}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {row.price > 0 ? row.price.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {row.amount > 0 ? row.amount.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
