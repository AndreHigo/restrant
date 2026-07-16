"use client";

import { Button } from "@/components/ui/button";

export function ReceiptPrintButton({ label = "Imprimir cupom" }: { label?: string }) {
  return (
    <Button className="no-print h-11" type="button" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
