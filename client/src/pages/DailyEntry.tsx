import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/mock-db";
import { useState } from "react";
import { Transaction, Item, ProcessType, TransactionType } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Check, Plus, Trash2, Box } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DailyEntry() {
  const { toast } = useToast();
  const { items, partners, addTransaction, calculateWeldConsumption } = useData();

  // Tab State
  const [activeTab, setActiveTab] = useState("production");

  // Form State
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [partnerId, setPartnerId] = useState("");
  const [remarks, setRemarks] = useState("");
  
  // Production State
  const [process, setProcess] = useState<ProcessType>("PRESS");
  const [prodItemId, setProdItemId] = useState("");
  const [prodQty, setProdQty] = useState<number>(0);
  
  // Preview for Weld
  const [weldPreview, setWeldPreview] = useState<{ materialId: string, quantity: number }[] | null>(null);

  // General Lines State (for Receipt/Shipment)
  const [lines, setLines] = useState<{ itemId: string, quantity: number, price: number }[]>([]);

  // Helpers
  const filteredItems = (type?: string, proc?: string) => {
    return items.filter(i => {
      if (type && i.type !== type) return false;
      if (proc && i.process !== proc) return false;
      return true;
    });
  };

  const handleAddLine = () => {
    setLines([...lines, { itemId: "", quantity: 0, price: 0 }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmitReceipt = () => {
    if (!partnerId || lines.length === 0) return;
    
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      type: 'PURCHASE_RECEIPT',
      partnerId,
      remarks,
      lines: lines.map(l => ({ id: Math.random().toString(), ...l })),
      createdAt: new Date().toISOString()
    };
    
    addTransaction(tx);
    toast({ title: "입고 등록 완료", description: `${lines.length}개 품목이 입고되었습니다.` });
    setLines([]);
    setRemarks("");
  };

  const handleSubmitShipment = () => {
     if (!partnerId || lines.length === 0) return;
    
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      type: 'SHIPMENT',
      partnerId,
      remarks,
      lines: lines.map(l => ({ id: Math.random().toString(), ...l })),
      createdAt: new Date().toISOString()
    };
    
    addTransaction(tx);
    toast({ title: "출고 등록 완료", description: `${lines.length}개 품목이 출고되었습니다.` });
    setLines([]);
    setRemarks("");
  };

  const handleCheckWeld = () => {
    if (!prodItemId || prodQty <= 0) return;
    const consumption = calculateWeldConsumption(prodItemId, prodQty, "2025-09");
    setWeldPreview(consumption);
  };

  const handleSubmitProduction = () => {
    if (!prodItemId || prodQty <= 0) return;

    let type: TransactionType = 'PRODUCTION_PRESS';
    if (process === 'WELD') type = 'PRODUCTION_WELD';
    if (process === 'PAINT') type = 'PRODUCTION_PAINT';

    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      type,
      remarks,
      lines: [
        { id: Math.random().toString(), itemId: prodItemId, quantity: prodQty }
        // Note: Logic implies backend/service handles consumption deduction based on this transaction.
        // In our mock 'getInventory', we assume production adds stock. 
        // Consumption needs to be handled separately or implicitly.
        // For 'Weld', we verified consumption. In a real system, we'd add negative lines here.
      ],
      createdAt: new Date().toISOString()
    };
    
    // If Weld, actually add consumption lines for the mock to work perfectly
    if (type === 'PRODUCTION_WELD' && weldPreview) {
      weldPreview.forEach(c => {
        tx.lines.push({
          id: Math.random().toString(),
          itemId: c.materialId,
          quantity: -c.quantity // Deduct
        });
      });
    } else {
        // Simple logic for Press/Paint if BOM exists, we could do same.
        // For MVP, only Weld was explicitly requested to show preview.
    }

    addTransaction(tx);
    toast({ title: "생산 실적 등록 완료", description: `${items.find(i => i.id === prodItemId)?.name} ${prodQty}개 생산` });
    
    setProdQty(0);
    setWeldPreview(null);
  };

  return (
    <AppLayout title="일일 전표 입력">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="receipt">입고 (구매)</TabsTrigger>
          <TabsTrigger value="production">생산 실적</TabsTrigger>
          <TabsTrigger value="shipment">납품 (출고)</TabsTrigger>
          <TabsTrigger value="scrap">스크랩</TabsTrigger>
        </TabsList>
        
        {/* RECEIPT TAB */}
        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle>구매/외주 입고 등록</CardTitle>
              <CardDescription>원재료, 부자재, 사급자재 입고 내역을 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>일자</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>거래처 (매입처)</Label>
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="거래처 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.filter(p => p.type === 'VENDOR' || p.type === 'BOTH').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>비고</Label>
                  <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="특이사항 입력" />
                </div>
              </div>

              <div className="border rounded-md p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm">입고 품목 리스트</h3>
                  <Button size="sm" variant="outline" onClick={handleAddLine}><Plus className="mr-2 h-4 w-4" /> 행 추가</Button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">품목</Label>
                        <Select value={line.itemId} onValueChange={(val) => updateLine(idx, 'itemId', val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="품목 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.filter(i => i.source === 'BUY').map(i => (
                              <SelectItem key={i.id} value={i.id}>[{i.code}] {i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs text-muted-foreground">수량</Label>
                        <Input type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs text-muted-foreground">단가</Label>
                        <Input type="number" value={line.price} onChange={e => updateLine(idx, 'price', Number(e.target.value))} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} className="mb-0.5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {lines.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded">품목을 추가해주세요</div>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleSubmitReceipt} disabled={!partnerId || lines.length === 0}>입고 확정</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* PRODUCTION TAB */}
        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>생산 실적 등록</CardTitle>
              <CardDescription>공정별 생산량을 입력합니다. 용접 공정은 BOM 차감이 자동 계산됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="space-y-2">
                  <Label>일자</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>공정 선택</Label>
                  <Select value={process} onValueChange={(val: ProcessType) => { setProcess(val); setProdItemId(""); setWeldPreview(null); }}>
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
              </div>

              <div className="p-6 bg-muted/30 rounded-lg border space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>생산 품목</Label>
                    <Select value={prodItemId} onValueChange={setProdItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="생산한 품목 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredItems(undefined, process).map(i => (
                          <SelectItem key={i.id} value={i.id}>[{i.code}] {i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>생산 수량 ({items.find(i => i.id === prodItemId)?.unit || 'ea'})</Label>
                    <Input type="number" value={prodQty} onChange={e => setProdQty(Number(e.target.value))} />
                  </div>
                </div>

                {process === 'WELD' && prodItemId && prodQty > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <Label className="text-primary font-semibold flex items-center gap-2">
                         <Box className="h-4 w-4" /> BOM 투입 미리보기
                       </Label>
                       <Button size="sm" variant="outline" onClick={handleCheckWeld}>계산하기</Button>
                    </div>
                   
                    {weldPreview ? (
                      <div className="border rounded bg-background">
                         <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>투입 자재</TableHead>
                               <TableHead className="text-right">소요량</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {weldPreview.map((line, i) => {
                               const mat = items.find(it => it.id === line.materialId);
                               return (
                                 <TableRow key={i}>
                                   <TableCell>{mat?.name} <span className="text-xs text-muted-foreground">[{mat?.code}]</span></TableCell>
                                   <TableCell className="text-right font-mono">{line.quantity} {mat?.unit}</TableCell>
                                 </TableRow>
                               );
                             })}
                           </TableBody>
                         </Table>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded text-center">
                        '계산하기'를 눌러 투입될 자재를 확인하세요.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button 
                onClick={handleSubmitProduction} 
                disabled={!prodItemId || prodQty <= 0 || (process === 'WELD' && !weldPreview)}
                className="w-full sm:w-auto"
              >
                <Check className="mr-2 h-4 w-4" /> 생산 실적 확정
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* SHIPMENT TAB */}
        <TabsContent value="shipment">
          <Card>
            <CardHeader>
              <CardTitle>제품 납품 (출고)</CardTitle>
              <CardDescription>고객사 납품 내역을 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Same structure as Receipt but for Customers */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>일자</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>거래처 (고객사)</Label>
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="거래처 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>비고</Label>
                  <Input value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>
              </div>

              <div className="border rounded-md p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm">출고 품목 리스트</h3>
                  <Button size="sm" variant="outline" onClick={handleAddLine}><Plus className="mr-2 h-4 w-4" /> 행 추가</Button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">품목</Label>
                        <Select value={line.itemId} onValueChange={(val) => updateLine(idx, 'itemId', val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="품목 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.filter(i => i.type === 'PRODUCT').map(i => (
                              <SelectItem key={i.id} value={i.id}>[{i.code}] {i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs text-muted-foreground">수량</Label>
                        <Input type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs text-muted-foreground">단가</Label>
                        <Input type="number" value={line.price} onChange={e => updateLine(idx, 'price', Number(e.target.value))} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} className="mb-0.5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
             <CardFooter className="justify-end">
              <Button onClick={handleSubmitShipment} disabled={!partnerId || lines.length === 0}>출고 확정</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="scrap">
          <Card>
            <CardHeader>
              <CardTitle>스크랩 반출</CardTitle>
            </CardHeader>
             <CardContent>
               <div className="flex items-center justify-center h-40 text-muted-foreground">
                 스크랩 기능은 준비 중입니다.
               </div>
             </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </AppLayout>
  );
}
