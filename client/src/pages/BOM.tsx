import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function BOM() {
  return (
    <AppLayout title="BOM 관리">
      <Card>
        <CardHeader>
          <CardTitle>BOM (자재명세서) 관리</CardTitle>
          <CardDescription>월별 BOM 버전을 관리하고 확정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
            BOM 관리 기능 준비 중
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
