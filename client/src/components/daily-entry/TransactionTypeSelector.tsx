import { Card } from "@/components/ui/card";
import { Download, Factory, Upload, Recycle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TransactionMode = "receipt" | "production" | "shipment" | "scrap";

interface TransactionTypeSelectorProps {
  value: TransactionMode;
  onChange: (mode: TransactionMode) => void;
}

const TRANSACTION_TYPES = [
  { id: "receipt" as const, label: "입고", sublabel: "구매/외주", icon: Download, color: "text-blue-600" },
  { id: "production" as const, label: "생산", sublabel: "실적 등록", icon: Factory, color: "text-green-600" },
  { id: "shipment" as const, label: "출고", sublabel: "납품", icon: Upload, color: "text-orange-600" },
  { id: "scrap" as const, label: "스크랩", sublabel: "반출", icon: Recycle, color: "text-gray-600" },
];

export function TransactionTypeSelector({ value, onChange }: TransactionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {TRANSACTION_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.id;

        return (
          <Card
            key={type.id}
            className={cn(
              "p-4 cursor-pointer transition-all border-2 hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-transparent hover:border-muted-foreground/20"
            )}
            onClick={() => onChange(type.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(type.id);
              }
            }}
            aria-pressed={isSelected}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Icon className={cn("h-6 w-6", !isSelected && type.color)} />
              </div>
              <div>
                <div className={cn("font-semibold", isSelected && "text-primary")}>
                  {type.label}
                </div>
                <div className="text-xs text-muted-foreground">{type.sublabel}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
