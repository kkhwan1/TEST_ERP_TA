import { AppLayout } from "@/components/layout/AppLayout";
import { useData } from "@/lib/mock-db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export default function Inventory() {
  const { items, getInventory } = useData();
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <AppLayout title="재고 조회" actions={<Button variant="outline" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" /> 새로고침</Button>}>
      <Card>
        <CardHeader>
          <CardTitle>현재고 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>코드</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead>규격</TableHead>
                <TableHead>단위</TableHead>
                <TableHead className="text-right">현재고</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const qty = getInventory(item.id);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.spec}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right font-bold font-mono">
                      {qty.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {qty < 0 ? (
                        <span className="text-destructive font-bold text-xs">부족</span>
                      ) : (
                        <span className="text-green-600 font-bold text-xs">정상</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
