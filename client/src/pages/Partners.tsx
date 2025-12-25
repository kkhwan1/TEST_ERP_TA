import { AppLayout } from "@/components/layout/AppLayout";
import { usePartners, useCreatePartner, useUpdatePartner, useDeletePartner } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ListFilter, Building2, ShoppingCart, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Partner } from "@/lib/types";

// Note: Backend uses auto-incrementing integer IDs, so no ID generation needed

// 한글 라벨 매핑
const PARTNER_TYPE_LABELS: Record<Partner['type'], string> = {
  VENDOR: '공급사',
  CUSTOMER: '고객사',
  BOTH: '공급사/고객사'
};

// Select 옵션 배열
const partnerTypeOptions = Object.entries(PARTNER_TYPE_LABELS).map(([value, label]) => ({ value, label }));

// 필터 옵션 (전체 포함)
const filterOptions = [
  { value: 'ALL', label: '전체' },
  ...partnerTypeOptions
];

// 필터 타입 정의
type PartnerFilterType = "all" | "vendor" | "customer" | "both";

// 필터 버튼 설정 (타입 안전성 강화)
const PARTNER_FILTER_BUTTONS: { type: PartnerFilterType; label: string; icon: React.ReactNode; partnerTypes: Partner['type'][] }[] = [
  { type: "all", label: "전체", icon: <ListFilter className="h-3.5 w-3.5" />, partnerTypes: [] },
  { type: "vendor", label: "공급사", icon: <Building2 className="h-3.5 w-3.5" />, partnerTypes: ["VENDOR"] },
  { type: "customer", label: "고객사", icon: <ShoppingCart className="h-3.5 w-3.5" />, partnerTypes: ["CUSTOMER"] },
  { type: "both", label: "공급/고객", icon: <Users className="h-3.5 w-3.5" />, partnerTypes: ["BOTH"] },
];

// 기본 폼 데이터
const defaultFormData: Partial<Partner> = {
  name: '',
  type: 'VENDOR',
  registrationNumber: '',
  contact: ''
};

export default function Partners() {
  // TanStack Query hooks
  const { data: partners = [], isLoading } = usePartners();
  const createPartner = useCreatePartner();
  const updatePartnerMutation = useUpdatePartner();
  const deletePartnerMutation = useDeletePartner();

  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<PartnerFilterType>("all");

  // Dialog 상태
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 편집 대상
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState<Partial<Partner>>(defaultFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // 필터 카운트 및 필터링된 거래처 (성능 최적화: 단일 순회)
  const { filterCounts, filteredPartners } = useMemo(() => {
    const counts: Record<PartnerFilterType, number> = {
      all: 0, vendor: 0, customer: 0, both: 0,
    };

    // 검색어 필터 먼저 적용
    let searchFiltered = partners;
    if (filter) {
      const lower = filter.toLowerCase();
      searchFiltered = partners.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        (p.registrationNumber?.includes(filter) ?? false)
      );
    }

    // 단일 순회로 카운트 계산
    searchFiltered.forEach(partner => {
      counts.all++;
      if (partner.type === "VENDOR") counts.vendor++;
      else if (partner.type === "CUSTOMER") counts.customer++;
      else if (partner.type === "BOTH") counts.both++;
    });

    // 유형 필터 적용
    let result = searchFiltered;
    if (activeFilter !== "all") {
      const filterConfig = PARTNER_FILTER_BUTTONS.find(f => f.type === activeFilter);
      if (filterConfig) {
        result = searchFiltered.filter(p => filterConfig.partnerTypes.includes(p.type));
      }
    }

    return { filterCounts: counts, filteredPartners: result };
  }, [partners, filter, activeFilter]);

  // 폼 초기화
  const resetForm = () => {
    setFormData(defaultFormData);
    setFormErrors([]);
    setEditingPartner(null);
  };

  // 추가 Dialog 열기
  const handleAddClick = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  // 수정 Dialog 열기
  const handleEditClick = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({ ...partner });
    setFormErrors([]);
    setFormDialogOpen(true);
  };

  // 삭제 확인 Dialog 열기
  const handleDeleteClick = (partner: Partner) => {
    setPartnerToDelete(partner);
    // Note: Backend will handle reference checking and return error if partner is in use
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  // 유효성 검사
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name?.trim()) errors.push('거래처명은 필수입니다');
    if (!formData.type) errors.push('거래처 유형은 필수입니다');

    // 사업자등록번호 중복 체크 (입력된 경우에만)
    if (formData.registrationNumber?.trim()) {
      const isDuplicate = partners.some(
        p => p.registrationNumber === formData.registrationNumber && p.id !== editingPartner?.id
      );
      if (isDuplicate) {
        errors.push('이미 존재하는 사업자등록번호입니다');
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  // 저장 (추가/수정)
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingPartner) {
        // 수정 - ID is string (UUID)
        await updatePartnerMutation.mutateAsync({
          id: editingPartner.id,
          data: {
            name: formData.name!,
            type: formData.type!,
            registrationNumber: formData.registrationNumber || null,
            contact: formData.contact || null,
          }
        });
        toast({ title: "거래처 수정 완료", description: `${formData.name} 거래처가 수정되었습니다.` });
      } else {
        // 추가 - backend will auto-generate ID
        await createPartner.mutateAsync({
          name: formData.name!,
          type: formData.type!,
          registrationNumber: formData.registrationNumber || null,
          contact: formData.contact || null,
        });
        toast({ title: "거래처 추가 완료", description: `${formData.name} 거래처가 추가되었습니다.` });
      }

      setFormDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!partnerToDelete) return;

    try {
      // ID is string (UUID)
      await deletePartnerMutation.mutateAsync(partnerToDelete.id);
      toast({ title: "거래처 삭제 완료", description: `${partnerToDelete.name} 거래처가 삭제되었습니다.` });
      setDeleteDialogOpen(false);
      setPartnerToDelete(null);
    } catch (error) {
      // Backend error likely means partner is referenced
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      setDeleteError(errorMessage);
      toast({
        title: "삭제 실패",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout
      title="거래처 관리"
      actions={<Button onClick={handleAddClick}><Plus className="mr-2 h-4 w-4" /> 거래처 추가</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>전체 거래처 리스트</CardTitle>
          <CardDescription>
            공급사(원자재 입고), 고객사(제품 출고) 관리
          </CardDescription>
          <div className="pt-4 space-y-4">
            {/* 검색 입력 */}
            <Input
              placeholder="거래처명 또는 사업자번호 검색..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />

            {/* 거래처유형 필터 버튼 */}
            <div className="flex flex-wrap gap-2">
              {PARTNER_FILTER_BUTTONS.map((filterBtn) => (
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center py-3">코드</TableHead>
                  <TableHead className="text-center py-3">거래처명</TableHead>
                  <TableHead className="text-center py-3">유형</TableHead>
                  <TableHead className="text-center py-3">사업자등록번호</TableHead>
                  <TableHead className="text-center py-3">연락처</TableHead>
                  <TableHead className="w-[100px] text-center py-3">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {filter || activeFilter !== "all" ? "검색 결과가 없습니다." : "등록된 거래처가 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium font-mono text-xs text-center py-3">{partner.id}</TableCell>
                  <TableCell className="text-center py-3">{partner.name}</TableCell>
                  <TableCell className="text-center py-3">
                    <Badge variant={
                      partner.type === 'VENDOR' ? 'default' :
                      partner.type === 'CUSTOMER' ? 'secondary' : 'outline'
                    }>
                      {PARTNER_TYPE_LABELS[partner.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center py-3">{partner.registrationNumber || '-'}</TableCell>
                  <TableCell className="text-center py-3">{partner.contact || '-'}</TableCell>
                  <TableCell className="text-center py-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(partner)}
                        title="수정"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(partner)}
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

      {/* 거래처 추가/수정 Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingPartner ? '거래처 수정' : '거래처 추가'}</DialogTitle>
            <DialogDescription>
              {editingPartner ? '거래처 정보를 수정합니다.' : '새로운 거래처를 등록합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 거래처명 */}
            <div className="space-y-2">
              <Label htmlFor="name">거래처명 *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: 포스코 스틸"
              />
            </div>

            {/* 유형 */}
            <div className="space-y-2">
              <Label>거래처 유형 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Partner['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {partnerTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 사업자등록번호 */}
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">사업자등록번호</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                placeholder="예: 123-45-67890"
              />
            </div>

            {/* 연락처 */}
            <div className="space-y-2">
              <Label htmlFor="contact">연락처</Label>
              <Input
                id="contact"
                value={formData.contact || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                placeholder="예: 02-1234-5678"
              />
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
              disabled={createPartner.isPending || updatePartnerMutation.isPending}
            >
              {createPartner.isPending || updatePartnerMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteError ? '삭제 불가' : '거래처 삭제'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <>
                  <strong>"{partnerToDelete?.name}"</strong> 거래처를 삭제할 수 없습니다.
                  <br /><br />
                  <span className="text-destructive font-medium">사유: {deleteError}</span>
                  <br /><br />
                  먼저 해당 거래내역을 수정하거나 삭제해주세요.
                </>
              ) : (
                <>
                  <strong>"{partnerToDelete?.name}"</strong> 거래처를 삭제하시겠습니까?
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
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  삭제
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
