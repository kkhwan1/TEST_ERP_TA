import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Closing() {
  return (
    <AppLayout title="월마감 및 보고서">
      <Card>
        <CardHeader>
          <CardTitle>월마감 프로세스</CardTitle>
          <CardDescription>재고 실사 입력 및 마감 처리를 진행합니다.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
            월마감 기능 준비 중
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
