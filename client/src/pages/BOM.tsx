import { AppLayout } from "@/components/layout/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Unlock, Edit, Trash2, AlertCircle, Copy, ListFilter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useItems, useBomHeaders, useCreateBomHeader, useUpdateBomHeader, useDeleteBomHeader, useFixBom } from "@/lib/api";
import type { BomHeaderWithLines } from "@/lib/api";

// Form line type (subset of InsertBomLine for UI)
interface FormBomLine {
  materialId: string;  // UUID
  quantity: string;
}

type BomFilterType = "all" | "fixed" | "editable";

const BOM_FILTER_BUTTONS: { type: BomFilterType; label: string; icon: React.ReactNode }[] = [
  { type: "all", label: "전체", icon: <ListFilter className="h-3.5 w-3.5" /> },
  { type: "fixed", label: "확정", icon: <Lock className="h-3.5 w-3.5" /> },
  { type: "editable", label: "편집가능", icon: <Unlock className="h-3.5 w-3.5" /> },
];

export default function BOM() {
  const { toast } = useToast();

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
  const [activeFilter, setActiveFilter] = useState<BomFilterType>("all");
  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BomHeaderWithLines | null>(null);
  const [selectedBomToFix, setSelectedBomToFix] = useState<BomHeaderWithLines | null>(null);

  // BOM Form state
  const [formItemId, setFormItemId] = useState<string | null>(null);
  const [formLines, setFormLines] = useState<FormBomLine[]>([
    { materialId: "", quantity: "0" }
  ]);

  // TanStack Query hooks
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: monthBoms = [], isLoading: bomsLoading } = useBomHeaders(selectedMonth);
  const createBomMutation = useCreateBomHeader();
  const updateBomMutation = useUpdateBomHeader();
  const deleteBomMutation = useDeleteBomHeader();
  const fixBomMutation = useFixBom();

  // Get MAKE items for BOM creation
  const makeItems = useMemo(() => {
    return items.filter(i => i.source === 'MAKE');
  }, [items]);

  // 필터 카운트 및 필터링된 BOM (성능 최적화: 단일 순회)
  const { filterCounts, filteredBoms } = useMemo(() => {
    const counts: Record<BomFilterType, number> = {
      all: 0, fixed: 0, editable: 0,
    };
    const fixed: BomHeaderWithLines[] = [];
    const editable: BomHeaderWithLines[] = [];

    // 단일 순회로 카운트 및 분류
    monthBoms.forEach(bom => {
      counts.all++;
      if (bom.isFixed) {
        counts.fixed++;
        fixed.push(bom);
      } else {
        counts.editable++;
        editable.push(bom);
      }
    });

    // 필터 적용
    let result: BomHeaderWithLines[];
    if (activeFilter === "fixed") result = fixed;
    else if (activeFilter === "editable") result = editable;
    else result = monthBoms;

    return { filterCounts: counts, filteredBoms: result };
  }, [monthBoms, activeFilter]);

  const handleOpenBomDialog = (bom?: BomHeaderWithLines) => {
    if (bom) {
      setEditingBom(bom);
      setFormItemId(bom.itemId);
      // Convert BomLine to FormBomLine (extract only materialId and quantity)
      // quantity comes as string from DB (numeric type)
      setFormLines(bom.lines.map(line => ({
        materialId: line.materialId,
        quantity: String(line.quantity)
      })));
    } else {
      setEditingBom(null);
      setFormItemId(null);
      setFormLines([{ materialId: "", quantity: "0" }]);
    }
    setBomDialogOpen(true);
  };

  const handleCloseBomDialog = () => {
    setBomDialogOpen(false);
    setEditingBom(null);
    setFormItemId(null);
    setFormLines([{ materialId: "", quantity: "0" }]);
  };

  const handleAddLine = () => {
    setFormLines([...formLines, { materialId: "", quantity: "0" }]);
  };

  const handleRemoveLine = (index: number) => {
    if (formLines.length > 1) {
      setFormLines(formLines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: 'materialId' | 'quantity', value: string) => {
    const newLines = [...formLines];
    if (field === 'materialId') {
      newLines[index] = { ...newLines[index], materialId: value };
    } else {
      newLines[index] = { ...newLines[index], quantity: value };
    }
    setFormLines(newLines);
  };

  const handleSaveBom = async () => {
    // Validation
    if (!formItemId) {
      toast({
        variant: "destructive",
        title: "생산품목을 선택해주세요",
      });
      return;
    }

    const invalidLines = formLines.filter(l => !l.materialId || parseFloat(l.quantity) <= 0);
    if (invalidLines.length > 0) {
      toast({
        variant: "destructive",
        title: "모든 자재 라인을 올바르게 입력해주세요",
      });
      return;
    }

    // Get the product item to determine process
    const productItem = items.find(i => i.id === formItemId);
    if (!productItem) {
      toast({
        variant: "destructive",
        title: "품목 정보를 찾을 수 없습니다",
      });
      return;
    }

    try {
      // Convert FormBomLine to InsertBomLine (add process and bomHeaderId)
      // Note: bomHeaderId will be set by backend, we just need process
      const bomLines = formLines.map(line => ({
        materialId: line.materialId,
        quantity: line.quantity,
        process: productItem.process, // Use the product's process
        bomHeaderId: editingBom?.id || "" // Placeholder, backend will set this
      }));

      if (editingBom) {
        // Update existing BOM
        await updateBomMutation.mutateAsync({
          id: editingBom.id,
          data: { lines: bomLines }
        });
        toast({
          title: "BOM이 수정되었습니다",
        });
      } else {
        // Create new BOM
        await createBomMutation.mutateAsync({
          header: {
            itemId: formItemId,
            version: selectedMonth,
            isFixed: false
          },
          lines: bomLines
        });
        toast({
          title: "BOM이 등록되었습니다",
        });
      }

      handleCloseBomDialog();
    } catch (error) {
      toast({
        variant: "destructive",
        title: editingBom ? "BOM 수정 실패" : "BOM 등록 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
      });
    }
  };

  const handleOpenFixDialog = (bom: BomHeaderWithLines) => {
    setSelectedBomToFix(bom);
    setFixDialogOpen(true);
  };

  const handleConfirmFix = async () => {
    if (selectedBomToFix) {
      try {
        await fixBomMutation.mutateAsync(selectedBomToFix.version);
        toast({
          title: "BOM이 확정되었습니다",
          description: "더 이상 수정할 수 없습니다.",
        });
        setFixDialogOpen(false);
        setSelectedBomToFix(null);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "BOM 확정 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        });
      }
    }
  };

  const handleDeleteBom = async (bom: BomHeaderWithLines) => {
    if (bom.isFixed) {
      toast({
        variant: "destructive",
        title: "확정된 BOM은 삭제할 수 없습니다",
      });
      return;
    }

    try {
      await deleteBomMutation.mutateAsync(bom.id);
      toast({
        title: "BOM이 삭제되었습니다",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "BOM 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
      });
    }
  };

  // TODO: Implement copy BOM API endpoint
  const handleOpenCopyDialog = () => {
    toast({
      variant: "destructive",
      title: "기능 준비 중",
      description: "BOM 복사 기능은 백엔드 API 연동 후 사용 가능합니다.",
    });
  };

  const getItemById = (itemId: string) => {
    return items.find(i => i.id === itemId);
  };

  return (
    <AppLayout
      title="BOM 관리"
      actions={
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
          <Button variant="outline" onClick={handleOpenCopyDialog}>
            <Copy className="mr-2 h-4 w-4" /> 이전 월 복사
          </Button>
          <Button onClick={() => handleOpenBomDialog()}>
            <Plus className="mr-2 h-4 w-4" /> BOM 등록
          </Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>BOM (자재명세서) 관리</CardTitle>
          <CardDescription>
            월별 BOM 버전을 관리하고 확정합니다. 확정된 BOM은 수정 및 삭제가 불가능합니다.
          </CardDescription>

          {/* BOM 상태 필터 버튼 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {BOM_FILTER_BUTTONS.map((filter) => (
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
        <CardContent>
          {bomsLoading || itemsLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
              <p>로딩 중...</p>
            </div>
          ) : filteredBoms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
              <p>
                {activeFilter === "all"
                  ? "해당 월에 등록된 BOM이 없습니다."
                  : `${BOM_FILTER_BUTTONS.find(f => f.type === activeFilter)?.label} BOM이 없습니다.`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center py-3 w-[100px]">품목코드</TableHead>
                  <TableHead className="text-center py-3">품목명</TableHead>
                  <TableHead className="text-center py-3">공정</TableHead>
                  <TableHead className="text-center py-3">자재수</TableHead>
                  <TableHead className="text-center py-3">상태</TableHead>
                  <TableHead className="text-center py-3">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoms.map((bom) => {
                  const item = getItemById(bom.itemId);
                  return (
                    <TableRow key={bom.id}>
                      <TableCell className="font-medium font-mono text-xs text-center py-3">
                        {item?.code}
                      </TableCell>
                      <TableCell className="text-center py-3">{item?.name}</TableCell>
                      <TableCell className="text-center py-3">{item?.process === 'NONE' ? '-' : item?.process}</TableCell>
                      <TableCell className="text-center py-3">{bom.lines?.length ?? 0}</TableCell>
                      <TableCell className="text-center py-3">
                        {bom.isFixed ? (
                          <Badge variant="default" className="bg-green-600">
                            <Lock className="mr-1 h-3 w-3" /> 확정
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Unlock className="mr-1 h-3 w-3" /> 편집가능
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={bom.isFixed ?? false}
                            onClick={() => handleOpenBomDialog(bom)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={bom.isFixed ?? false}
                            onClick={() => handleDeleteBom(bom)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={bom.isFixed ?? false}
                            onClick={() => handleOpenFixDialog(bom)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* BOM Form Dialog */}
      <Dialog open={bomDialogOpen} onOpenChange={setBomDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBom ? 'BOM 수정' : 'BOM 등록'}</DialogTitle>
            <DialogDescription>
              생산품목의 자재명세서를 등록합니다. 확정 전까지 수정 가능합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item">생산품목</Label>
                <Select
                  value={formItemId || ""}
                  onValueChange={(value) => setFormItemId(value)}
                  disabled={!!editingBom}
                >
                  <SelectTrigger id="item">
                    <SelectValue placeholder="품목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {makeItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month">적용월</Label>
                <Input
                  id="month"
                  value={selectedMonth}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>투입자재</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                  <Plus className="h-4 w-4 mr-1" /> 자재 추가
                </Button>
              </div>

              <div className="space-y-2">
                {formLines.map((line, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select
                        value={line.materialId || ""}
                        onValueChange={(value) => handleLineChange(index, 'materialId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="자재 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.code} - {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="소요량"
                        value={line.quantity || ''}
                        onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveLine(index)}
                      disabled={formLines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBomDialog}>
              취소
            </Button>
            <Button onClick={handleSaveBom}>
              {editingBom ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Confirmation Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>BOM 확정</DialogTitle>
            <DialogDescription>
              BOM을 확정하면 더 이상 수정할 수 없습니다.
            </DialogDescription>
          </DialogHeader>

          {selectedBomToFix && (
            <div className="py-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">생산품목:</span>
                  <span>{getItemById(selectedBomToFix.itemId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">적용월:</span>
                  <span>{selectedBomToFix.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">자재 라인 수:</span>
                  <span>{selectedBomToFix.lines?.length ?? 0}개</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                확정 후에는 수정 및 삭제가 불가능합니다.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFixDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfirmFix}>
              확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
