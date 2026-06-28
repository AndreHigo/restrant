"use client";

import { Button } from "@/components/ui/button";

export function ReceiptPrintButton() {
  return (
    <Button className="no-print h-11" type="button" onClick={() => window.print()}>
      Imprimir recibo
    </Button>
  );
}
