import { AppLayout } from "@/components/layout/AppLayout";
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ListFilter, Package, Layers, Box, Recycle, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Item, ItemType, ProcessType } from "@/lib/types";
import type { InsertItem } from "@shared/schema";

// Backend generates numeric IDs, so we don't need client-side ID generation anymore

// 필터 타입 정의
type ItemFilterType = "all" | "raw" | "sub" | "product" | "scrap" | "consumable";

const ITEM_FILTER_BUTTONS: { type: ItemFilterType; label: string; icon: React.ReactNode; itemTypes: ItemType[] }[] = [
  { type: "all", label: "전체", icon: <ListFilter className="h-3.5 w-3.5" />, itemTypes: [] },
  { type: "raw", label: "원자재", icon: <Package className="h-3.5 w-3.5" />, itemTypes: ["RAW"] },
  { type: "sub", label: "반제품", icon: <Layers className="h-3.5 w-3.5" />, itemTypes: ["SUB"] },
  { type: "product", label: "완제품", icon: <Box className="h-3.5 w-3.5" />, itemTypes: ["PRODUCT"] },
  { type: "scrap", label: "스크랩", icon: <Recycle className="h-3.5 w-3.5" />, itemTypes: ["SCRAP"] },
  { type: "consumable", label: "부자재", icon: <Wrench className="h-3.5 w-3.5" />, itemTypes: ["CONSUMABLE"] },
];

// 한글 라벨 매핑
const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  RAW: '원자재',
  SUB: '반제품',
  PRODUCT: '완제품',
  SCRAP: '스크랩',
  CONSUMABLE: '부자재'
};

const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  NONE: '없음',
  PRESS: '프레스',
  WELD: '용접',
  PAINT: '도장'
};

const SOURCE_LABELS: Record<'MAKE' | 'BUY', string> = {
  BUY: '구매',
  MAKE: '제조'
};

// Select 옵션 배열
const itemTypeOptions = Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const processTypeOptions = Object.entries(PROCESS_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const sourceOptions = Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }));

// 기본 폼 데이터
const defaultFormData: Partial<Item> = {
  code: '',
  name: '',
  spec: '',
  unit: 'ea',
  type: 'RAW',
  process: 'NONE',
  source: 'BUY',
  cost: 0
};

export default function Items() {
  const { data: items = [], isLoading } = useItems();
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<ItemFilterType>("all");

  // Dialog 상태
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 편집 대상
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState<Partial<Item>>(defaultFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // 필터 카운트 및 필터링된 품목 리스트 (성능 최적화: 단일 순회)
  const { filterCounts, filteredItems } = useMemo(() => {
    const counts: Record<ItemFilterType, number> = {
      all: 0, raw: 0, sub: 0, product: 0, scrap: 0, consumable: 0,
    };

    // 텍스트 검색 먼저 적용
    let searchFiltered = items;
    if (filter) {
      const lower = filter.toLowerCase();
      searchFiltered = items.filter(item =>
        item.name.toLowerCase().includes(lower) ||
        item.code.toLowerCase().includes(lower)
      );
    }

    // 단일 순회로 카운트 계산
    searchFiltered.forEach(item => {
      counts.all++;
      if (item.type === "RAW") counts.raw++;
      else if (item.type === "SUB") counts.sub++;
      else if (item.type === "PRODUCT") counts.product++;
      else if (item.type === "SCRAP") counts.scrap++;
      else if (item.type === "CONSUMABLE") counts.consumable++;
    });

    // 품목유형 필터 적용
    let result = searchFiltered;
    if (activeFilter !== "all") {
      const filterConfig = ITEM_FILTER_BUTTONS.find(f => f.type === activeFilter);
      if (filterConfig) {
        result = searchFiltered.filter(item => filterConfig.itemTypes.includes(item.type));
      }
    }

    return { filterCounts: counts, filteredItems: result };
  }, [items, filter, activeFilter]);

  // 폼 초기화
  const resetForm = () => {
    setFormData(defaultFormData);
    setFormErrors([]);
    setEditingItem(null);
  };

  // 추가 Dialog 열기
  const handleAddClick = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  // 수정 Dialog 열기
  const handleEditClick = (item: Item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setFormErrors([]);
    setFormDialogOpen(true);
  };

  // 삭제 확인 Dialog 열기
  const handleDeleteClick = (item: Item) => {
    setItemToDelete(item);
    setDeleteError(null); // Backend will return error if item is referenced
    setDeleteDialogOpen(true);
  };

  // 유효성 검사 (기본 클라이언트 검사만, 중복 체크는 백엔드에서)
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.code?.trim()) errors.push('품목코드는 필수입니다');
    if (!formData.name?.trim()) errors.push('품목명은 필수입니다');
    if (!formData.unit?.trim()) errors.push('단위는 필수입니다');
    if ((formData.cost ?? 0) < 0) errors.push('표준원가는 0 이상이어야 합니다');

    setFormErrors(errors);
    return errors.length === 0;
  };

  // 저장 (추가/수정)
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingItem) {
        // 수정 - ID는 string이므로 number로 변환
        const itemData: Partial<InsertItem> = {
          code: formData.code,
          name: formData.name,
          spec: formData.spec,
          unit: formData.unit,
          type: formData.type,
          process: formData.process,
          source: formData.source,
          cost: formData.cost?.toString() || '0',
        };

        await updateItemMutation.mutateAsync({
          id: editingItem.id,
          data: itemData,
        });

        toast({
          title: "품목 수정 완료",
          description: `${formData.name} 품목이 수정되었습니다.`
        });
      } else {
        // 추가
        const itemData: InsertItem = {
          code: formData.code!,
          name: formData.name!,
          spec: formData.spec || '',
          unit: formData.unit!,
          type: formData.type as ItemType,
          process: formData.process as ProcessType,
          source: formData.source as 'MAKE' | 'BUY',
          cost: formData.cost?.toString() || '0',
        };

        await createItemMutation.mutateAsync(itemData);

        toast({
          title: "품목 추가 완료",
          description: `${formData.name} 품목이 추가되었습니다.`
        });
      }

      setFormDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: editingItem ? "품목 수정 실패" : "품목 추가 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await deleteItemMutation.mutateAsync(itemToDelete.id);

      toast({
        title: "품목 삭제 완료",
        description: `${itemToDelete.name} 품목이 삭제되었습니다.`
      });

      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

      // Parse backend error message for reference errors
      if (errorMessage.includes('BOM') || errorMessage.includes('거래내역')) {
        setDeleteError(errorMessage);
      } else {
        toast({
          title: "삭제 실패",
          description: errorMessage,
          variant: "destructive"
        });
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    }
  };

  return (
    <AppLayout
      title="품목 관리"
      actions={<Button onClick={handleAddClick}><Plus className="mr-2 h-4 w-4" /> 품목 추가</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>전체 품목 리스트</CardTitle>
          <CardDescription>
            원재료, 부자재, 반제품(프레스/용접), 완제품(도장), 스크랩 관리
          </CardDescription>
          <div className="pt-4">
             <Input
              placeholder="품목코드 또는 품목명 검색..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
             />
          </div>

          {/* 품목유형 필터 버튼 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {ITEM_FILTER_BUTTONS.map((filterBtn) => (
              <Button
                key={filterBtn.type}
                variant={activeFilter === filterBtn.type ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setActiveFilter(filterBtn.type)}
              >
                {filterBtn.icon}
                <span className="ml-1.5">{filterBtn.label}</span>
                <Badge
                  variant={activeFilter === filterBtn.type ? "secondary" : "outline"}
                  className={`ml-1.5 h-5 px-1.5 text-[10px] ${
                    activeFilter === filterBtn.type
                      ? "bg-white/20 text-white border-0"
                      : "bg-muted"
                  }`}
                >
                  {filterCounts[filterBtn.type]}
                </Badge>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-center">코드</TableHead>
                  <TableHead className="text-center">품목명</TableHead>
                  <TableHead className="text-center">규격</TableHead>
                  <TableHead className="text-center">단위</TableHead>
                  <TableHead className="text-center">유형</TableHead>
                  <TableHead className="text-center">공정</TableHead>
                  <TableHead className="text-center">조달</TableHead>
                  <TableHead className="text-center">표준원가</TableHead>
                  <TableHead className="w-[100px] text-center">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {filter ? "검색 결과가 없습니다." : "등록된 품목이 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-medium font-mono text-xs py-3">{item.code}</TableCell>
                  <TableCell className="text-center py-3">{item.name}</TableCell>
                  <TableCell className="text-center py-3">{item.spec}</TableCell>
                  <TableCell className="text-center py-3">{item.unit}</TableCell>
                  <TableCell className="text-center py-3">
                    <Badge variant={
                      item.type === 'PRODUCT' ? 'default' :
                      item.type === 'RAW' ? 'outline' :
                      item.type === 'SCRAP' ? 'destructive' : 'secondary'
                    }>
                      {ITEM_TYPE_LABELS[item.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center py-3">{item.process === 'NONE' ? '-' : PROCESS_TYPE_LABELS[item.process]}</TableCell>
                  <TableCell className="text-center py-3">{SOURCE_LABELS[item.source]}</TableCell>
                  <TableCell className="text-center font-mono text-xs py-3">
                    {item.cost?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center py-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(item)}
                        title="수정"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(item)}
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 품목 추가/수정 Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? '품목 수정' : '품목 추가'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '품목 정보를 수정합니다.' : '새로운 품목을 등록합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 품목코드, 품목명 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">품목코드 *</Label>
                <Input
                  id="code"
                  value={formData.code || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="예: RAW-003"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">품목명 *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: Steel Plate 3.0t"
                />
              </div>
            </div>

            {/* 규격, 단위 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spec">규격</Label>
                <Input
                  id="spec"
                  value={formData.spec || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, spec: e.target.value }))}
                  placeholder="예: 3.0t x 1219mm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">단위 *</Label>
                <Input
                  id="unit"
                  value={formData.unit || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="예: kg, ea, L"
                />
              </div>
            </div>

            {/* 유형, 공정 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>품목유형 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as ItemType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>공정 *</Label>
                <Select
                  value={formData.process}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, process: value as ProcessType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="공정 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {processTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 조달구분, 표준원가 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>조달구분 *</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value as 'MAKE' | 'BUY' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="조달 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">표준원가</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {formErrors.length > 0 && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {formErrors.map((err, i) => (
                  <div key={i}>⚠️ {err}</div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>취소</Button>
            <Button
              onClick={handleSave}
              disabled={createItemMutation.isPending || updateItemMutation.isPending}
            >
              {(createItemMutation.isPending || updateItemMutation.isPending) ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteError ? '⚠️ 삭제 불가' : '품목 삭제'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <>
                  <strong>"{itemToDelete?.name}"</strong> 품목을 삭제할 수 없습니다.
                  <br /><br />
                  <span className="text-destructive font-medium">사유: {deleteError}</span>
                  <br /><br />
                  먼저 해당 BOM 또는 거래내역을 수정하거나 삭제해주세요.
                </>
              ) : (
                <>
                  <strong>"{itemToDelete?.name}"</strong> 품목을 삭제하시겠습니까?
                  <br /><br />
                  이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {deleteError ? (
              <AlertDialogAction onClick={() => setDeleteDialogOpen(false)}>확인</AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={deleteItemMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteItemMutation.isPending ? "삭제 중..." : "삭제"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
