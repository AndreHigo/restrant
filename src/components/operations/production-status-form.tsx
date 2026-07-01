"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ProductionStatus = "PENDING" | "PREPARING" | "READY" | "DELIVERED" | "CANCELED";

export function ProductionStatusForm({
  label,
  productionItemId,
  status,
  variant = "secondary"
}: {
  label: string;
  productionItemId: string;
  status: ProductionStatus;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function onClick() {
    const response = await fetch("/api/operations/production/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productionItemId,
        status
      })
    });

    if (!response.ok) {
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <Button className="h-10" disabled={isPending} type="button" variant={variant} onClick={onClick}>
      {isPending ? "Atualizando..." : label}
    </Button>
  );
}
