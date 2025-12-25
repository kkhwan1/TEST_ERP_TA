import { AppLayout } from "@/components/layout/AppLayout";
import { useItems, useBomHeaders, useMonthlyPrices, useSnapshot, useCreateSnapshot, useUpdateSnapshotLine, useCloseMonth } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { Camera, ClipboardEdit, Scale, Lock, CheckCircle, AlertCircle, ChevronRight, XCircle, Printer, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EnhancedInventorySnapshot, InventorySnapshotLine } from "@/lib/types";

// CSV 다운로드 유틸리티
function downloadCSV(data: Record<string, any>[], filename: string, headers: { key: string; label: string }[]) {
  const headerRow = headers.map(h => h.label).join(',');
  const dataRows = data.map(row =>
    headers.map(h => {
      const value = row[h.key] ?? '';
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

type Step = 1 | 2 | 3 | 4;

export default function Closing() {
  const { toast } = useToast();

  // Query hooks
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: boms = [], isLoading: bomsLoading } = useBomHeaders();
  const { data: monthlyPrices = [], isLoading: pricesLoading } = useMonthlyPrices();

  // Generate last 12 months for selector
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(format(date, 'yyyy-MM'));
    }
    return months;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]);
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Snapshot query and mutations
  const { data: snapshot, isLoading: snapshotLoading } = useSnapshot(selectedMonth);
  const createSnapshotMutation = useCreateSnapshot();
  const updateSnapshotLineMutation = useUpdateSnapshotLine();
  const closeMonthMutation = useCloseMonth();

  // Set appropriate step based on snapshot status
  useEffect(() => {
    if (snapshot) {
      if (snapshot.status === 'CLOSED') {
        setCurrentStep(4);
      } else if (snapshot.lines.some(l => l.differenceReason)) {
        setCurrentStep(3);
      } else if (snapshot.lines.some(l => l.actualQty !== l.calculatedQty)) {
        setCurrentStep(2);
      } else {
        setCurrentStep(2);
      }
    } else {
      setCurrentStep(1);
    }
  }, [snapshot]);

  const isClosed = useMemo(() => {
    return snapshot?.status === 'CLOSED';
  }, [snapshot]);

  // Pre-closing checklist validation
  const preClosingChecks = useMemo(() => {
    const hasBom = boms.some(bom => bom.version === selectedMonth && bom.isFixed);
    const hasPrice = monthlyPrices.some(price => price.month === selectedMonth);
    const allChecksPassed = hasBom && hasPrice;

    return {
      hasBom,
      hasPrice,
      allChecksPassed
    };
  }, [boms, monthlyPrices, selectedMonth]);

  const steps = [
    { number: 1, title: '스냅샷 생성', icon: Camera },
    { number: 2, title: '실사 입력', icon: ClipboardEdit },
    { number: 3, title: '차이 분석', icon: Scale },
    { number: 4, title: '마감 확정', icon: Lock },
  ];

  const handleCreateSnapshot = async () => {
    try {
      await createSnapshotMutation.mutateAsync(selectedMonth);
      setCurrentStep(2);
      toast({
        title: "스냅샷이 생성되었습니다",
        description: `${items.length}개 품목의 재고가 조회되었습니다.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "스냅샷 생성 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
      });
    }
  };

  const handleUpdateActualQty = async (itemId: string, value: string) => {
    if (!snapshot) return;

    // Find the snapshot line for this item
    const line = snapshot.lines.find(l => l.itemId === itemId);
    if (!line) return;

    const lineId = line.id;

    try {
      await updateSnapshotLineMutation.mutateAsync({
        id: lineId,
        data: { actualQty: value },
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "업데이트 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
      });
    }
  };

  const handleUpdateReason = async (itemId: string, reason: string) => {
    if (!snapshot) return;

    // Find the snapshot line for this item
    const line = snapshot.lines.find(l => l.itemId === itemId);
    if (!line) return;

    const lineId = line.id;

    try {
      await updateSnapshotLineMutation.mutateAsync({
        id: lineId,
        data: { differenceReason: reason },
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "업데이트 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
      });
    }
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleCloseMonth = async () => {
    if (!snapshot) return;

    try {
      await closeMonthMutation.mutateAsync(selectedMonth);
      toast({
        title: "월마감이 완료되었습니다",
        description: "재고 조정 트랜잭션이 생성되었습니다.",
      });
      setCurrentStep(4);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "마감 처리 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
      });
    }
  };

  const getItemById = (itemId: string) => {
    return items.find(i => i.id === itemId);
  };

  const varianceLines = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.lines.filter(l => l.differenceQty !== 0);
  }, [snapshot]);

  const varianceSummary = useMemo(() => {
    const gains = varianceLines.filter(l => l.differenceQty > 0);
    const losses = varianceLines.filter(l => l.differenceQty < 0);
    return {
      totalGainItems: gains.length,
      totalLossItems: losses.length,
      totalGainQty: gains.reduce((sum, l) => sum + l.differenceQty, 0),
      totalLossQty: losses.reduce((sum, l) => sum + Math.abs(l.differenceQty), 0),
    };
  }, [varianceLines]);

  // 인쇄 기능
  const handlePrint = () => {
    window.print();
  };

  // CSV 다운로드 기능
  const handleDownloadCSV = () => {
    if (!snapshot) return;

    const data = snapshot.lines.map(line => {
      const item = getItemById(line.itemId);
      return {
        code: item?.code || '',
        name: item?.name || '',
        unit: item?.unit || '',
        calculatedQty: line.calculatedQty,
        actualQty: line.actualQty,
        differenceQty: line.differenceQty,
        differenceReason: line.differenceReason || ''
      };
    });

    downloadCSV(data, `월마감보고서_${selectedMonth}.csv`, [
      { key: 'code', label: '품목코드' },
      { key: 'name', label: '품목명' },
      { key: 'unit', label: '단위' },
      { key: 'calculatedQty', label: '시스템재고' },
      { key: 'actualQty', label: '실사재고' },
      { key: 'differenceQty', label: '차이' },
      { key: 'differenceReason', label: '사유' }
    ]);
  };

  // 차이내역 CSV 다운로드
  const handleDownloadVarianceCSV = () => {
    if (!snapshot || varianceLines.length === 0) return;

    const data = varianceLines.map(line => {
      const item = getItemById(line.itemId);
      return {
        code: item?.code || '',
        name: item?.name || '',
        unit: item?.unit || '',
        calculatedQty: line.calculatedQty,
        actualQty: line.actualQty,
        differenceQty: line.differenceQty,
        differenceReason: line.differenceReason || ''
      };
    });

    downloadCSV(data, `재고차이내역_${selectedMonth}.csv`, [
      { key: 'code', label: '품목코드' },
      { key: 'name', label: '품목명' },
      { key: 'unit', label: '단위' },
      { key: 'calculatedQty', label: '시스템재고' },
      { key: 'actualQty', label: '실사재고' },
      { key: 'differenceQty', label: '차이' },
      { key: 'differenceReason', label: '사유' }
    ]);
  };

  // Show loading state
  if (itemsLoading || bomsLoading || pricesLoading || snapshotLoading) {
    return (
      <AppLayout title="월마감 및 보고서" actions={<PrintButton />}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">데이터를 불러오는 중...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="월마감 및 보고서"
      actions={<PrintButton />}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>월마감</CardTitle>
                <CardDescription>재고 실사 입력 및 마감 처리를 진행합니다.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {snapshot && (
                  <Badge variant={isClosed ? "default" : "outline"} className={isClosed ? "bg-green-600" : ""}>
                    {isClosed ? (
                      <>
                        <Lock className="mr-1 h-3 w-3" /> 마감완료
                      </>
                    ) : (
                      <>
                        <ClipboardEdit className="mr-1 h-3 w-3" /> 진행중
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Step Progress Indicator */}
          <CardContent>
            <div className="flex items-center justify-between mb-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.number || isClosed;
                const isCurrent = currentStep === step.number && !isClosed;

                return (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center mb-2
                          ${isCompleted ? 'bg-green-600 text-white' : ''}
                          ${isCurrent ? 'bg-blue-600 text-white' : ''}
                          ${!isCompleted && !isCurrent ? 'bg-gray-200 text-gray-500' : ''}
                        `}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <div className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : ''}`}>
                        {step.title}
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="mt-6">
              {/* Step 1: Create Snapshot */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">스냅샷 생성 안내</h3>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>선택한 월의 마지막 날짜 기준으로 시스템 재고를 조회합니다.</li>
                      <li>조회된 재고는 실사 입력의 기준이 됩니다.</li>
                      <li>스냅샷 생성 후 실사 수량을 입력할 수 있습니다.</li>
                    </ul>
                  </div>

                  {/* Pre-closing Checklist */}
                  <Card className={!preClosingChecks.allChecksPassed ? "border-orange-300" : "border-green-300"}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        마감 전 체크리스트
                        {preClosingChecks.allChecksPassed ? (
                          <Badge variant="default" className="bg-green-600">완료</Badge>
                        ) : (
                          <Badge variant="destructive">미완료</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        월마감을 진행하기 전에 다음 항목을 확인해주세요.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {preClosingChecks.hasBom ? (
                            <CheckCircle className="text-green-500 h-5 w-5" />
                          ) : (
                            <XCircle className="text-red-500 h-5 w-5" />
                          )}
                          <span className={preClosingChecks.hasBom ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                            BOM 확정
                          </span>
                          {!preClosingChecks.hasBom && (
                            <span className="text-sm text-muted-foreground ml-auto">
                              BOM 페이지에서 {selectedMonth} BOM을 확정해주세요
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {preClosingChecks.hasPrice ? (
                            <CheckCircle className="text-green-500 h-5 w-5" />
                          ) : (
                            <XCircle className="text-red-500 h-5 w-5" />
                          )}
                          <span className={preClosingChecks.hasPrice ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                            가격 설정
                          </span>
                          {!preClosingChecks.hasPrice && (
                            <span className="text-sm text-muted-foreground ml-auto">
                              가격 페이지에서 {selectedMonth} 가격을 설정해주세요
                            </span>
                          )}
                        </div>
                      </div>

                      {!preClosingChecks.allChecksPassed && (
                        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                            <p className="text-sm text-orange-800">
                              모든 체크리스트 항목이 완료되어야 스냅샷 생성 및 마감 절차를 진행할 수 있습니다.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {!snapshot && (
                    <div className="flex justify-center py-8">
                      <Button
                        size="lg"
                        onClick={handleCreateSnapshot}
                        disabled={!preClosingChecks.allChecksPassed || createSnapshotMutation.isPending}
                      >
                        <Camera className="mr-2 h-5 w-5" />
                        {createSnapshotMutation.isPending ? '생성 중...' : '스냅샷 생성'}
                      </Button>
                    </div>
                  )}

                  {snapshot && !isClosed && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-900 mb-2">
                        <CheckCircle className="h-5 w-5" />
                        <h3 className="font-semibold">스냅샷 생성 완료</h3>
                      </div>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>품목 수: {snapshot.lines.length}개</p>
                        <p>생성일시: {format(new Date(snapshot.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
                      </div>
                      <div className="mt-4">
                        <Button
                          onClick={handleNextStep}
                          disabled={!preClosingChecks.allChecksPassed}
                        >
                          다음 단계 <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                        {!preClosingChecks.allChecksPassed && (
                          <p className="text-sm text-orange-600 mt-2">
                            체크리스트의 모든 항목이 완료되어야 다음 단계로 진행할 수 있습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {isClosed && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-900 mb-2">
                        <Lock className="h-5 w-5" />
                        <h3 className="font-semibold">마감 완료</h3>
                      </div>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>마감일시: {snapshot?.closedAt ? format(new Date(snapshot.closedAt), 'yyyy-MM-dd HH:mm:ss') : '-'}</p>
                        <p>조정 트랜잭션: {snapshot?.adjustmentTxId || '없음'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Actual Count Input */}
              {currentStep === 2 && snapshot && !isClosed && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">실사 수량 입력</h3>
                    <p className="text-sm text-blue-800">
                      각 품목의 실제 재고 수량을 입력하세요. 시스템 재고와 차이가 있으면 자동으로 계산됩니다.
                    </p>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">품목코드</TableHead>
                        <TableHead>품목명</TableHead>
                        <TableHead className="w-[80px]">단위</TableHead>
                        <TableHead className="text-right w-[120px]">시스템재고</TableHead>
                        <TableHead className="text-right w-[120px]">실사수량</TableHead>
                        <TableHead className="text-right w-[100px]">차이</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshot.lines.map((line) => {
                        const item = getItemById(line.itemId);
                        const isNegativeDiff = line.differenceQty < 0;
                        const isPositiveDiff = line.differenceQty > 0;

                        return (
                          <TableRow key={line.id}>
                            <TableCell className="font-medium font-mono text-xs">
                              {item?.code}
                            </TableCell>
                            <TableCell>{item?.name}</TableCell>
                            <TableCell>{item?.unit}</TableCell>
                            <TableCell className="text-right font-mono">
                              {line.calculatedQty.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={line.actualQty}
                                onChange={(e) => handleUpdateActualQty(line.itemId, e.target.value)}
                                className="text-right font-mono"
                                step="0.01"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-mono font-semibold ${
                                  isNegativeDiff ? 'text-red-600' : isPositiveDiff ? 'text-green-600' : ''
                                }`}
                              >
                                {line.differenceQty > 0 ? '+' : ''}
                                {line.differenceQty.toLocaleString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <Button onClick={handleNextStep}>
                      다음 단계 <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Variance Analysis */}
              {currentStep === 3 && snapshot && !isClosed && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">차이 분석</h3>
                    <p className="text-sm text-blue-800">
                      시스템 재고와 실사 수량의 차이가 있는 품목에 대해 사유를 입력하세요.
                    </p>
                  </div>

                  {/* Summary Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-green-600">재고 증가</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-green-600">
                            {varianceSummary.totalGainItems}건
                          </div>
                          <div className="text-sm text-muted-foreground">
                            총 +{varianceSummary.totalGainQty.toLocaleString()} 단위
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-red-600">재고 감소</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-red-600">
                            {varianceSummary.totalLossItems}건
                          </div>
                          <div className="text-sm text-muted-foreground">
                            총 -{varianceSummary.totalLossQty.toLocaleString()} 단위
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {varianceLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mb-3 opacity-50 text-green-600" />
                      <p>재고 차이가 없습니다. 다음 단계로 진행하세요.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">품목코드</TableHead>
                          <TableHead>품목명</TableHead>
                          <TableHead className="text-right w-[100px]">시스템재고</TableHead>
                          <TableHead className="text-right w-[100px]">실사수량</TableHead>
                          <TableHead className="text-right w-[80px]">차이</TableHead>
                          <TableHead className="w-[300px]">사유</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {varianceLines.map((line) => {
                          const item = getItemById(line.itemId);
                          const isNegativeDiff = line.differenceQty < 0;
                          const isPositiveDiff = line.differenceQty > 0;

                          return (
                            <TableRow key={line.id}>
                              <TableCell className="font-medium font-mono text-xs">
                                {item?.code}
                              </TableCell>
                              <TableCell>{item?.name}</TableCell>
                              <TableCell className="text-right font-mono">
                                {line.calculatedQty.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {line.actualQty.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={`font-mono font-semibold ${
                                    isNegativeDiff ? 'text-red-600' : isPositiveDiff ? 'text-green-600' : ''
                                  }`}
                                >
                                  {line.differenceQty > 0 ? '+' : ''}
                                  {line.differenceQty.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={line.differenceReason || ''}
                                  onChange={(e) => handleUpdateReason(line.itemId, e.target.value)}
                                  placeholder="차이 발생 사유 입력"
                                  className="text-sm"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleNextStep}>
                      다음 단계 <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Close Confirmation */}
              {currentStep === 4 && snapshot && (
                <div className="space-y-4">
                  {!isClosed ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">마감 확정</h3>
                        <p className="text-sm text-blue-800">
                          월마감을 확정하면 재고 조정 트랜잭션이 생성되며, 더 이상 수정할 수 없습니다.
                        </p>
                      </div>

                      {/* Adjustment Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle>조정 내역 요약</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {varianceLines.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-600" />
                              <p>재고 조정이 필요하지 않습니다.</p>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>품목코드</TableHead>
                                  <TableHead>품목명</TableHead>
                                  <TableHead className="text-right">조정수량</TableHead>
                                  <TableHead>사유</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {varianceLines.map((line) => {
                                  const item = getItemById(line.itemId);
                                  const isNegativeDiff = line.differenceQty < 0;
                                  const isPositiveDiff = line.differenceQty > 0;

                                  return (
                                    <TableRow key={line.id}>
                                      <TableCell className="font-medium font-mono text-xs">
                                        {item?.code}
                                      </TableCell>
                                      <TableCell>{item?.name}</TableCell>
                                      <TableCell className="text-right">
                                        <span
                                          className={`font-mono font-semibold ${
                                            isNegativeDiff ? 'text-red-600' : isPositiveDiff ? 'text-green-600' : ''
                                          }`}
                                        >
                                          {line.differenceQty > 0 ? '+' : ''}
                                          {line.differenceQty.toLocaleString()} {item?.unit}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {line.differenceReason || '-'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-semibold mb-1">마감 확정 시 처리 내용</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li><strong>조정 트랜잭션 자동 생성</strong>: 실사-산출 차이분에 대해 ADJUSTMENT 트랜잭션이 자동 생성됩니다.</li>
                              <li><strong>다음 달 기초재고 반영</strong>: 마감된 월의 실사재고가 다음 달 기초재고로 자동 반영됩니다.</li>
                              <li><strong>수정 불가</strong>: 확정 후에는 해당 월의 실사 수량 및 사유를 수정할 수 없습니다.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep(3)}
                          disabled={closeMonthMutation.isPending}
                        >
                          마감 취소
                        </Button>
                        <Button
                          onClick={handleCloseMonth}
                          disabled={closeMonthMutation.isPending}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          {closeMonthMutation.isPending ? '처리 중...' : '마감 확정'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                            <CheckCircle className="h-7 w-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-green-900">마감이 완료되었습니다</h3>
                            <p className="text-sm text-green-700">
                              {selectedMonth} 월마감 처리가 성공적으로 완료되었습니다.
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">마감일시:</span>
                            <span className="font-medium">
                              {snapshot.closedAt ? format(new Date(snapshot.closedAt), 'yyyy-MM-dd HH:mm:ss') : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">조정 트랜잭션:</span>
                            <span className="font-medium font-mono text-xs">
                              {snapshot.adjustmentTxId || '없음'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">조정 항목 수:</span>
                            <span className="font-medium">
                              {varianceLines.length}건
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="text-muted-foreground">다음 달 기초재고:</span>
                            <span className="font-medium text-green-600">
                              실사재고 기준 자동 반영됨
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 보고서 다운로드/인쇄 버튼 */}
                      <div className="flex gap-3 print:hidden">
                        <Button variant="outline" onClick={handlePrint}>
                          <Printer className="mr-2 h-4 w-4" /> 인쇄
                        </Button>
                        <Button variant="outline" onClick={handleDownloadCSV}>
                          <Download className="mr-2 h-4 w-4" /> 전체 보고서 CSV
                        </Button>
                        {varianceLines.length > 0 && (
                          <Button variant="outline" onClick={handleDownloadVarianceCSV}>
                            <Download className="mr-2 h-4 w-4" /> 차이내역 CSV
                          </Button>
                        )}
                      </div>

                      {/* 재고 비교표 (인쇄용) */}
                      <Card className="print:shadow-none print:border-0">
                        <CardHeader className="print:pb-2">
                          <CardTitle className="text-lg">{selectedMonth} 재고 비교표</CardTitle>
                          <CardDescription className="print:hidden">마감 시점의 시스템재고와 실사재고 비교</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[100px]">품목코드</TableHead>
                                <TableHead>품목명</TableHead>
                                <TableHead className="w-[60px]">단위</TableHead>
                                <TableHead className="text-right w-[100px]">시스템재고</TableHead>
                                <TableHead className="text-right w-[100px]">실사재고</TableHead>
                                <TableHead className="text-right w-[80px]">차이</TableHead>
                                <TableHead className="w-[200px]">사유</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {snapshot.lines.map((line) => {
                                const item = getItemById(line.itemId);
                                const isNegativeDiff = line.differenceQty < 0;
                                const isPositiveDiff = line.differenceQty > 0;

                                return (
                                  <TableRow key={line.id}>
                                    <TableCell className="font-medium font-mono text-xs">
                                      {item?.code}
                                    </TableCell>
                                    <TableCell>{item?.name}</TableCell>
                                    <TableCell>{item?.unit}</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {line.calculatedQty.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                      {line.actualQty.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span
                                        className={`font-mono font-semibold ${
                                          isNegativeDiff ? 'text-red-600' : isPositiveDiff ? 'text-green-600' : ''
                                        }`}
                                      >
                                        {line.differenceQty !== 0 && (line.differenceQty > 0 ? '+' : '')}
                                        {line.differenceQty !== 0 ? line.differenceQty.toLocaleString() : '-'}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {line.differenceReason || '-'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
