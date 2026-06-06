"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function KitchenStatusForm({
  salesOrderId,
  nextStatus,
  label
}: {
  salesOrderId: string;
  nextStatus: "PREPARING" | "READY" | "DELIVERED";
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function onClick() {
    setError("");
    const response = await fetch("/api/operations/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderId,
        status: nextStatus
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Falha ao atualizar status.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div>
      <Button disabled={isPending} type="button" variant="secondary" onClick={onClick}>
        {isPending ? "Atualizando..." : label}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
