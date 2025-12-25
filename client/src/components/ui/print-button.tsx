import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  className?: string;
  label?: string;
}

export function PrintButton({ className, label = "인쇄" }: PrintButtonProps) {
  const handlePrint = () => {
    // SSR/테스트 환경 가드 (Codex 리뷰 반영)
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Button
      type="button" // 폼 제출 방지 (Codex 리뷰 반영)
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className={className}
    >
      <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
      {label}
    </Button>
  );
}
