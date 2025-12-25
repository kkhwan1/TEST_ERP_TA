import { AppLayout } from "@/components/layout/AppLayout";
import { useItems, useInventory, useItemLedger } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrintButton } from "@/components/ui/print-button";
import { RefreshCw, Search, Download, FileText, Loader2, ListFilter, Package, ArrowDownCircle, ArrowUpCircle, Settings } from "lucide-react";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

// CSV 다운로드 유틸리티
function downloadCSV(data: Record<string, any>[], filename: string, headers: { key: string; label: string }[]) {
  const headerRow = headers.map(h => h.label).join(',');
  const dataRows = data.map(row =>
    headers.map(h => {
      const value = row[h.key] ?? '';
      // 쉼표나 줄바꿈이 포함된 경우 따옴표로 감싸기
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// 개별 품목의 재고를 표시하는 Row 컴포넌트
function InventoryRow({ item }: { item: { id: string; code: string; name: string; spec: string; unit: string } }) {
  const { data: inventoryData, isLoading } = useInventory(item.id);
  const qty = inventoryData?.quantity ?? 0;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{item.code}</TableCell>
      <TableCell>{item.name}</TableCell>
      <TableCell>{item.spec}</TableCell>
      <TableCell>{item.unit}</TableCell>
      <TableCell className="text-right font-bold font-mono">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin inline" />
        ) : (
          qty.toLocaleString()
        )}
      </TableCell>
      <TableCell>
        {qty < 0 ? (
          <Badge variant="destructive">부족</Badge>
        ) : qty === 0 ? (
          <Badge variant="secondary">없음</Badge>
        ) : (
          <Badge variant="default" className="bg-green-600">정상</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

// 선택된 품목의 현재고를 표시하는 컴포넌트
function SelectedItemInventory({ itemId, unit }: { itemId: string; unit: string }) {
  const { data: inventoryData, isLoading } = useInventory(itemId);
  const qty = inventoryData?.quantity ?? 0;

  if (isLoading) {
    return (
      <div className="text-xl font-bold text-blue-900">
        <Loader2 className="h-5 w-5 animate-spin inline" />
      </div>
    );
  }

  return (
    <div className="text-xl font-bold text-blue-900">
      {qty.toLocaleString()} {unit}
    </div>
  );
}

// 수불부 필터 타입 정의
type LedgerFilterType = "all" | "in" | "out" | "adjustment";

const LEDGER_FILTER_BUTTONS: { type: LedgerFilterType; label: string; icon: React.ReactNode }[] = [
  { type: "all", label: "전체", icon: <ListFilter className="h-3.5 w-3.5" /> },
  { type: "in", label: "입고", icon: <ArrowDownCircle className="h-3.5 w-3.5" /> },
  { type: "out", label: "출고", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
  { type: "adjustment", label: "조정", icon: <Settings className="h-3.5 w-3.5" /> },
];

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<'current' | 'ledger'>('current');

  // 수불부 필터 상태
  const [ledgerItemId, setLedgerItemId] = useState<string>('');
  const [ledgerStartDate, setLedgerStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [ledgerEndDate, setLedgerEndDate] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilterType>("all");

  // 현재고 필터
  const [stockFilter, setStockFilter] = useState<string>('');

  // TanStack Query hooks
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useItems();

  // 수불부 데이터 조회 (ledgerItemId가 있을 때만 활성화)
  const { data: ledgerEntries = [], isLoading: isLoadingLedger } = useItemLedger(
    ledgerItemId || "",
    ledgerStartDate,
    ledgerEndDate
  );

  const refresh = () => {
    refetchItems();
  };

  // 필터링된 현재고
  const filteredItems = useMemo(() => {
    if (!stockFilter) return items;
    const lower = stockFilter.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(lower) ||
      item.code.toLowerCase().includes(lower)
    );
  }, [items, stockFilter]);

  // 선택된 품목 정보
  const selectedItem = items.find(i => i.id.toString() === ledgerItemId);

  // 수불부 필터별 건수 계산
  const ledgerFilterCounts = useMemo(() => {
    const counts: Record<LedgerFilterType, number> = {
      all: ledgerEntries.length,
      in: 0,
      out: 0,
      adjustment: 0,
    };
    ledgerEntries.forEach(entry => {
      if (entry.type === 'OPENING_BALANCE') {
        // 기초재고는 전체에만 포함
      } else if (entry.inQty > 0 && entry.outQty === 0) {
        counts.in++;
      } else if (entry.outQty > 0 && entry.inQty === 0) {
        counts.out++;
      } else if (entry.type === 'ADJUSTMENT') {
        counts.adjustment++;
      }
    });
    return counts;
  }, [ledgerEntries]);

  // 필터링된 수불부 데이터
  const filteredLedgerEntries = useMemo(() => {
    if (ledgerFilter === "all") return ledgerEntries;
    return ledgerEntries.filter(entry => {
      if (ledgerFilter === "in") {
        return entry.inQty > 0 && entry.outQty === 0 && entry.type !== 'OPENING_BALANCE';
      } else if (ledgerFilter === "out") {
        return entry.outQty > 0 && entry.inQty === 0;
      } else if (ledgerFilter === "adjustment") {
        return entry.type === 'ADJUSTMENT';
      }
      return true;
    });
  }, [ledgerEntries, ledgerFilter]);

  // 현재고 CSV 다운로드 - NOTE: 각 품목의 재고를 개별적으로 가져와야 함
  const handleDownloadStock = async () => {
    // TODO: 백엔드 API 연결 후 배치 조회로 최적화 필요
    // 현재는 개별 조회로 인해 성능 이슈 가능
    const data = await Promise.all(
      filteredItems.map(async (item) => {
        try {
          const res = await fetch(`/api/inventory/${item.id}`);
          const inventoryData = await res.json();
          const qty = inventoryData.quantity || 0;
          return {
            code: item.code,
            name: item.name,
            spec: item.spec,
            unit: item.unit,
            quantity: qty,
            status: qty < 0 ? '부족' : '정상'
          };
        } catch {
          return {
            code: item.code,
            name: item.name,
            spec: item.spec,
            unit: item.unit,
            quantity: 0,
            status: '오류'
          };
        }
      })
    );

    downloadCSV(data, `현재고_${format(new Date(), 'yyyyMMdd')}.csv`, [
      { key: 'code', label: '품목코드' },
      { key: 'name', label: '품목명' },
      { key: 'spec', label: '규격' },
      { key: 'unit', label: '단위' },
      { key: 'quantity', label: '현재고' },
      { key: 'status', label: '상태' }
    ]);
  };

  // 수불부 CSV 다운로드
  const handleDownloadLedger = () => {
    if (!selectedItem || ledgerEntries.length === 0) return;

    const data = ledgerEntries.map(entry => ({
      date: entry.date,
      type: entry.typeName,
      partner: entry.partnerName || '-',
      inQty: entry.inQty || '',
      outQty: entry.outQty || '',
      balance: entry.balance,
      remarks: entry.remarks || ''
    }));

    downloadCSV(data, `수불부_${selectedItem.code}_${format(new Date(), 'yyyyMMdd')}.csv`, [
      { key: 'date', label: '일자' },
      { key: 'type', label: '거래유형' },
      { key: 'partner', label: '거래처' },
      { key: 'inQty', label: '입고' },
      { key: 'outQty', label: '출고' },
      { key: 'balance', label: '잔고' },
      { key: 'remarks', label: '비고' }
    ]);
  };

  return (
    <AppLayout
      title="재고/수불부"
      actions={
        <>
          <PrintButton />
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> 새로고침
          </Button>
        </>
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'current' | 'ledger')}>
        <TabsList className="mb-4">
          <TabsTrigger value="current">현재고</TabsTrigger>
          <TabsTrigger value="ledger">수불부</TabsTrigger>
        </TabsList>

        {/* 현재고 탭 */}
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>현재고 현황</CardTitle>
                  <CardDescription>품목별 현재 재고 수량을 조회합니다.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadStock}>
                  <Download className="mr-2 h-4 w-4" /> CSV 다운로드
                </Button>
              </div>
              <div className="pt-4">
                <Input
                  placeholder="품목명 또는 코드로 검색..."
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>코드</TableHead>
                    <TableHead>품목명</TableHead>
                    <TableHead>규격</TableHead>
                    <TableHead>단위</TableHead>
                    <TableHead className="text-right">현재고</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingItems ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        품목이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <InventoryRow key={item.id} item={item} />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 수불부 탭 */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>품목별 수불부</CardTitle>
                  <CardDescription>품목의 입출고 내역과 잔고를 조회합니다.</CardDescription>
                </div>
                {ledgerEntries.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleDownloadLedger}>
                    <Download className="mr-2 h-4 w-4" /> CSV 다운로드
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 필터 영역 */}
              <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>품목 선택</Label>
                    <Select value={ledgerItemId} onValueChange={setLedgerItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="품목을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.code} - {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>시작일</Label>
                    <Input
                      type="date"
                      value={ledgerStartDate}
                      onChange={(e) => setLedgerStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일</Label>
                    <Input
                      type="date"
                      value={ledgerEndDate}
                      onChange={(e) => setLedgerEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        // TanStack Query automatically refetches when dependencies change
                        // This button is kept for user feedback but doesn't need manual refresh
                      }}
                      disabled={!ledgerItemId}
                      className="w-full"
                    >
                      <Search className="mr-2 h-4 w-4" /> 조회
                    </Button>
                  </div>
                </div>
              </div>

              {/* 선택된 품목 정보 */}
              {selectedItem && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-semibold text-blue-900">{selectedItem.name}</div>
                      <div className="text-sm text-blue-700">
                        {selectedItem.code} | {selectedItem.spec} | {selectedItem.unit}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-sm text-blue-600">현재고</div>
                      <SelectedItemInventory itemId={selectedItem.id} unit={selectedItem.unit} />
                    </div>
                  </div>
                </div>
              )}

              {/* 수불부 필터 버튼 */}
              {ledgerItemId && ledgerEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {LEDGER_FILTER_BUTTONS.map((filter) => (
                    <Button
                      key={filter.type}
                      variant={ledgerFilter === filter.type ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setLedgerFilter(filter.type)}
                    >
                      {filter.icon}
                      <span className="ml-1.5">{filter.label}</span>
                      <Badge
                        variant={ledgerFilter === filter.type ? "secondary" : "outline"}
                        className={`ml-1.5 h-5 px-1.5 text-[10px] ${
                          ledgerFilter === filter.type
                            ? "bg-white/20 text-white border-0"
                            : "bg-muted"
                        }`}
                      >
                        {ledgerFilterCounts[filter.type]}
                      </Badge>
                    </Button>
                  ))}
                </div>
              )}

              {/* 수불부 테이블 */}
              {!ledgerItemId ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-50" />
                  <p>품목을 선택하면 수불 내역을 조회합니다.</p>
                </div>
              ) : isLoadingLedger ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">수불 내역을 불러오는 중...</p>
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-50" />
                  <p>해당 기간에 거래 내역이 없습니다.</p>
                </div>
              ) : filteredLedgerEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-50" />
                  <p>해당 유형의 거래가 없습니다.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px] text-center font-semibold">일자</TableHead>
                      <TableHead className="w-[120px] text-center font-semibold">거래유형</TableHead>
                      <TableHead className="text-center font-semibold">거래처</TableHead>
                      <TableHead className="text-center w-[100px] font-semibold">입고</TableHead>
                      <TableHead className="text-center w-[100px] font-semibold">출고</TableHead>
                      <TableHead className="text-center w-[120px] font-semibold">잔고</TableHead>
                      <TableHead className="text-center font-semibold">비고</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedgerEntries.map((entry, idx) => (
                      <TableRow
                        key={`${entry.transactionId || 'opening'}-${idx}`}
                        className={entry.type === 'OPENING_BALANCE' ? 'bg-muted/50' : 'hover:bg-muted/30'}
                      >
                        <TableCell className="font-mono text-xs text-center py-3">{entry.date}</TableCell>
                        <TableCell className="text-center py-3">
                          <Badge
                            variant={
                              entry.type === 'OPENING_BALANCE' ? 'secondary' :
                              entry.inQty > 0 ? 'default' : 'outline'
                            }
                            className={entry.inQty > 0 && entry.type !== 'OPENING_BALANCE' ? 'bg-green-600' : ''}
                          >
                            {entry.typeName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-center py-3">{entry.partnerName || '-'}</TableCell>
                        <TableCell className="text-center font-mono text-green-600 font-medium py-3">
                          {entry.inQty > 0 ? `+${entry.inQty.toLocaleString()}` : ''}
                        </TableCell>
                        <TableCell className="text-center font-mono text-red-600 font-medium py-3">
                          {entry.outQty > 0 ? `-${entry.outQty.toLocaleString()}` : ''}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold py-3">
                          {entry.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-center py-3">
                          {entry.remarks || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* 수불부 요약 */}
              {ledgerEntries.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">총 입고</div>
                      <div className="text-2xl font-bold text-green-600">
                        +{ledgerEntries.reduce((sum, e) => sum + e.inQty, 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">총 출고</div>
                      <div className="text-2xl font-bold text-red-600">
                        -{ledgerEntries.reduce((sum, e) => sum + e.outQty, 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">기말 잔고</div>
                      <div className="text-2xl font-bold">
                        {ledgerEntries[ledgerEntries.length - 1]?.balance.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
