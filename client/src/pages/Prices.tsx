import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Prices() {
  return (
    <AppLayout title="단가 관리">
      <Card>
        <CardHeader>
          <CardTitle>월별 단가 관리</CardTitle>
          <CardDescription>매입/매출 단가를 월별로 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
            단가 관리 기능 준비 중
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
