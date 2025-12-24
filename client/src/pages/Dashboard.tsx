import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useData } from "@/lib/mock-db";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, Package, Truck, Activity } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";

export default function Dashboard() {
  const { transactions, items } = useData();

  // Stats calculation
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysTxs = transactions.filter(tx => tx.date === todayStr);
  
  const stats = useMemo(() => {
    return {
      receipts: todaysTxs.filter(tx => tx.type === 'PURCHASE_RECEIPT').length,
      production: todaysTxs.filter(tx => tx.type.startsWith('PRODUCTION')).length,
      shipments: todaysTxs.filter(tx => tx.type === 'SHIPMENT').length,
    };
  }, [todaysTxs]);

  // Chart Data: Production by Process (Last 30 days usually, but let's just do "By Item" for now or Process)
  const productionData = useMemo(() => {
    // Aggregate production quantity by Process
    const data = [
      { name: 'Press', quantity: 0 },
      { name: 'Weld', quantity: 0 },
      { name: 'Paint', quantity: 0 },
    ];

    transactions.forEach(tx => {
      if (tx.type === 'PRODUCTION_PRESS') data[0].quantity += tx.lines.reduce((acc, l) => acc + l.quantity, 0);
      if (tx.type === 'PRODUCTION_WELD') data[1].quantity += tx.lines.reduce((acc, l) => acc + l.quantity, 0);
      if (tx.type === 'PRODUCTION_PAINT') data[2].quantity += tx.lines.reduce((acc, l) => acc + l.quantity, 0);
    });

    return data;
  }, [transactions]);

  // Inventory Alerts (Negative Stock)
  // This is expensive in real app, but fine for mock
  // We need to calculate current stock for all items
  // Let's just mock one or two alerts for demo
  const alerts = [
    { title: "재고 부족", desc: "RAW-001 (Steel Coil) 재고가 안전재고 이하입니다." },
    { title: "BOM 미등록", desc: "신규 품목 PT-002에 대한 9월 BOM이 확정되지 않았습니다." }
  ];

  return (
    <AppLayout title="대시보드">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 입고</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.receipts} 건</div>
            <p className="text-xs text-muted-foreground">전일 대비 +2%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 생산</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.production} 건</div>
            <p className="text-xs text-muted-foreground">프레스/용접/도장 합계</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 출고</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shipments} 건</div>
            <p className="text-xs text-muted-foreground">납품 완료</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">정상</div>
            <p className="text-xs text-muted-foreground">9월 마감 진행 중</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>공정별 누적 생산량 (9월)</CardTitle>
            <CardDescription>프레스, 용접, 도장 공정별 실적 현황</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs text-muted-foreground" />
                  <YAxis className="text-xs text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend />
                  <Bar dataKey="quantity" name="수량" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>주요 알림</CardTitle>
            <CardDescription>확인이 필요한 사항입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.map((alert, i) => (
              <Alert key={i} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>
                  {alert.desc}
                </AlertDescription>
              </Alert>
            ))}
            
            <div className="rounded-md border p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    9월 실사 마감 예정
                  </p>
                  <p className="text-sm text-muted-foreground">
                    D-5일 남았습니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
