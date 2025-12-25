import { AppLayout } from "@/components/layout/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Edit, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MonthlyPrice } from "@/lib/types";
import { format } from "date-fns";
import {
  useItems,
  useMonthlyPrices,
  useCreateMonthlyPrice,
  useUpdateMonthlyPrice,
  useDeleteMonthlyPrice,
  useFixMonthlyPrices,
  useMonthlyPriceStatus,
} from "@/lib/api";

export default function Prices() {
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
  const [activeTab, setActiveTab] = useState<'PURCHASE' | 'SALES'>('PURCHASE');
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<MonthlyPrice | null>(null);

  // Price Form state
  const [formItemId, setFormItemId] = useState<string>("");
  const [formPrice, setFormPrice] = useState<number>(0);

  // Query hooks
  const { data: items = [], isLoading: isLoadingItems } = useItems();
  const { data: monthlyPrices = [], isLoading: isLoadingPrices } = useMonthlyPrices(selectedMonth);
  const { data: priceStatus } = useMonthlyPriceStatus(selectedMonth);

  // Mutation hooks
  const createPriceMutation = useCreateMonthlyPrice();
  const updatePriceMutation = useUpdateMonthlyPrice();
  const deletePriceMutation = useDeleteMonthlyPrice();
  const fixPricesMutation = useFixMonthlyPrices();

  // Check if month is fixed
  const isFixed = useMemo(() => {
    return priceStatus?.isFixed || false;
  }, [priceStatus]);

  // Get prices for selected month and tab
  const monthPrices = useMemo(() => {
    return monthlyPrices.filter(p => p.type === activeTab);
  }, [monthlyPrices, activeTab]);

  // Get items for current tab
  const availableItems = useMemo(() => {
    if (activeTab === 'PURCHASE') {
      return items.filter(i => i.source === 'BUY');
    } else {
      return items.filter(i => i.type === 'PRODUCT');
    }
  }, [items, activeTab]);

  const handleOpenPriceDialog = (price?: MonthlyPrice) => {
    if (price) {
      setEditingPrice(price);
      setFormItemId(price.itemId); // itemId is already string (UUID)
      setFormPrice(price.price);
    } else {
      setEditingPrice(null);
      setFormItemId("");
      setFormPrice(0);
    }
    setPriceDialogOpen(true);
  };

  const handleClosePriceDialog = () => {
    setPriceDialogOpen(false);
    setEditingPrice(null);
    setFormItemId("");
    setFormPrice(0);
  };

  const handleSavePrice = () => {
    // Validation
    if (!formItemId) {
      toast({
        variant: "destructive",
        title: "품목을 선택해주세요",
      });
      return;
    }

    if (formPrice <= 0) {
      toast({
        variant: "destructive",
        title: "단가를 입력해주세요",
      });
      return;
    }

    // Check if price already exists for this item in this month
    const existingPrice = monthlyPrices.find(
      p => p.itemId === formItemId &&
      p.month === selectedMonth &&
      p.type === activeTab &&
      p.id !== editingPrice?.id
    );

    if (existingPrice) {
      toast({
        variant: "destructive",
        title: "이미 해당 품목의 단가가 등록되어 있습니다",
      });
      return;
    }

    if (editingPrice) {
      // Update existing price
      updatePriceMutation.mutate(
        {
          id: editingPrice.id, // editingPrice.id is already string (UUID)
          data: { price: formPrice.toString() }
        },
        {
          onSuccess: () => {
            toast({
              title: "단가가 수정되었습니다",
            });
            handleClosePriceDialog();
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "단가 수정 실패",
              description: error.message,
            });
          },
        }
      );
    } else {
      // Create new price
      createPriceMutation.mutate(
        {
          month: selectedMonth,
          itemId: formItemId, // formItemId is already string (UUID)
          price: formPrice.toString(),
          type: activeTab
        },
        {
          onSuccess: () => {
            toast({
              title: "단가가 등록되었습니다",
            });
            handleClosePriceDialog();
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "단가 등록 실패",
              description: error.message,
            });
          },
        }
      );
    }
  };

  const handleDeletePrice = (price: MonthlyPrice) => {
    if (isFixed) {
      toast({
        variant: "destructive",
        title: "확정된 월의 단가는 삭제할 수 없습니다",
      });
      return;
    }

    deletePriceMutation.mutate(price.id, {
      onSuccess: () => {
        toast({
          title: "단가가 삭제되었습니다",
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "단가 삭제 실패",
          description: error.message,
        });
      },
    });
  };

  const handleOpenFixDialog = () => {
    setFixDialogOpen(true);
  };

  const handleConfirmFix = () => {
    fixPricesMutation.mutate(selectedMonth, {
      onSuccess: () => {
        toast({
          title: "단가가 확정되었습니다",
          description: "더 이상 수정할 수 없습니다.",
        });
        setFixDialogOpen(false);
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "단가 확정 실패",
          description: error.message,
        });
      },
    });
  };

  const getItemById = (itemId: string) => {
    return items.find(i => i.id === itemId);
  };

  return (
    <AppLayout
      title="단가 관리"
      actions={
        <div className="flex items-center gap-3">
          {isFixed && (
            <Badge variant="default" className="bg-green-600">
              <Lock className="mr-1 h-3 w-3" /> 확정됨
            </Badge>
          )}
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
          <Button onClick={handleOpenFixDialog} disabled={isFixed}>
            <Lock className="mr-2 h-4 w-4" /> 단가 확정
          </Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>월별 단가 관리</CardTitle>
          <CardDescription>
            매입/매출 단가를 월별로 관리합니다. 확정된 월의 단가는 수정 및 삭제가 불가능합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'PURCHASE' | 'SALES')}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="PURCHASE">매입단가</TabsTrigger>
              <TabsTrigger value="SALES">매출단가</TabsTrigger>
            </TabsList>

            {/* Purchase Prices Tab */}
            <TabsContent value="PURCHASE" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => handleOpenPriceDialog()} disabled={isFixed}>
                  <Plus className="mr-2 h-4 w-4" /> 단가 등록
                </Button>
              </div>

              {monthPrices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                  <p>등록된 단가가 없습니다.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">품목코드</TableHead>
                      <TableHead>품목명</TableHead>
                      <TableHead>규격</TableHead>
                      <TableHead className="w-[80px]">단위</TableHead>
                      <TableHead className="text-right w-[140px]">단가 (원)</TableHead>
                      <TableHead className="text-right w-[140px]">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthPrices.map((price) => {
                      const item = getItemById(price.itemId);
                      return (
                        <TableRow key={price.id}>
                          <TableCell className="font-medium font-mono text-xs">
                            {item?.code}
                          </TableCell>
                          <TableCell>{item?.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item?.spec}
                          </TableCell>
                          <TableCell>{item?.unit}</TableCell>
                          <TableCell className="text-right font-medium">
                            {price.price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isFixed}
                                onClick={() => handleOpenPriceDialog(price)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isFixed}
                                onClick={() => handleDeletePrice(price)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Sales Prices Tab */}
            <TabsContent value="SALES" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => handleOpenPriceDialog()} disabled={isFixed}>
                  <Plus className="mr-2 h-4 w-4" /> 단가 등록
                </Button>
              </div>

              {monthPrices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                  <p>등록된 단가가 없습니다.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">품목코드</TableHead>
                      <TableHead>품목명</TableHead>
                      <TableHead>규격</TableHead>
                      <TableHead className="w-[80px]">단위</TableHead>
                      <TableHead className="text-right w-[140px]">단가 (원)</TableHead>
                      <TableHead className="text-right w-[140px]">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthPrices.map((price) => {
                      const item = getItemById(price.itemId);
                      return (
                        <TableRow key={price.id}>
                          <TableCell className="font-medium font-mono text-xs">
                            {item?.code}
                          </TableCell>
                          <TableCell>{item?.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item?.spec}
                          </TableCell>
                          <TableCell>{item?.unit}</TableCell>
                          <TableCell className="text-right font-medium">
                            {price.price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isFixed}
                                onClick={() => handleOpenPriceDialog(price)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isFixed}
                                onClick={() => handleDeletePrice(price)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Price Form Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPrice ? '단가 수정' : '단가 등록'}</DialogTitle>
            <DialogDescription>
              {activeTab === 'PURCHASE' ? '매입' : '매출'} 단가를 등록합니다. 확정 전까지 수정 가능합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item">품목</Label>
              <Select
                value={formItemId}
                onValueChange={setFormItemId}
                disabled={!!editingPrice}
              >
                <SelectTrigger id="item">
                  <SelectValue placeholder="품목 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">단가</Label>
              <div className="relative">
                <Input
                  id="price"
                  type="number"
                  value={formPrice || ''}
                  onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="1"
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  원
                </span>
              </div>
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

          <DialogFooter>
            <Button variant="outline" onClick={handleClosePriceDialog}>
              취소
            </Button>
            <Button onClick={handleSavePrice} disabled={isFixed}>
              {editingPrice ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Confirmation Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>단가 확정</DialogTitle>
            <DialogDescription>
              단가를 확정하면 해당 월의 모든 단가가 수정 불가능합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">적용월:</span>
                <span>{selectedMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">매입단가:</span>
                <span>{monthlyPrices.filter(p => p.type === 'PURCHASE').length}건</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">매출단가:</span>
                <span>{monthlyPrices.filter(p => p.type === 'SALES').length}건</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              확정 후에는 수정 및 삭제가 불가능합니다.
            </div>
          </div>

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
