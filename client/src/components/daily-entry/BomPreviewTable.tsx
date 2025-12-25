import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Box, Calculator } from "lucide-react";
import { Item } from "@/lib/types";

interface BomPreviewTableProps {
  preview: { materialId: string; quantity: number }[] | null;
  items: Item[];
  onCalculate: () => void;
  disabled?: boolean;
}

export function BomPreviewTable({
  preview,
  items,
  onCalculate,
  disabled = false,
}: BomPreviewTableProps) {
  const getMaterial = (materialId: string) => items.find((i) => i.id === materialId);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-primary font-semibold flex items-center gap-2">
          <Box className="h-4 w-4" /> BOM 투입 미리보기
        </Label>
        <Button
          size="sm"
          variant="outline"
          onClick={onCalculate}
          disabled={disabled}
        >
          <Calculator className="mr-2 h-4 w-4" />
          계산하기
        </Button>
      </div>

      {preview ? (
        <div className="border rounded bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>투입 자재</TableHead>
                <TableHead className="text-right">소요량</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((line, i) => {
                const mat = getMaterial(line.materialId);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      {mat?.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        [{mat?.code}]
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.quantity.toLocaleString()} {mat?.unit}
                    </TableCell>
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
  );
}
