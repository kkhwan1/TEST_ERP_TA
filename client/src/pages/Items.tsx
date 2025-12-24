import { AppLayout } from "@/components/layout/AppLayout";
import { useData } from "@/lib/mock-db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Items() {
  const { items } = useData();
  const [filter, setFilter] = useState("");

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(filter.toLowerCase()) || 
    i.code.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AppLayout title="품목 관리" actions={<Button><Plus className="mr-2 h-4 w-4" /> 품목 추가</Button>}>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">코드</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead>규격</TableHead>
                <TableHead>단위</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>공정</TableHead>
                <TableHead>조달</TableHead>
                <TableHead className="text-right">표준원가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium font-mono text-xs">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.spec}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>
                    <Badge variant={
                      item.type === 'PRODUCT' ? 'default' : 
                      item.type === 'RAW' ? 'outline' : 
                      item.type === 'SCRAP' ? 'destructive' : 'secondary'
                    }>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.process === 'NONE' ? '-' : item.process}</TableCell>
                  <TableCell>{item.source}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {item.cost?.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
