"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PurchaseCancelForm({
  canCancel,
  orderId
}: {
  canCancel: boolean;
  orderId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function cancelOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/admin/purchases/cancel", {
      body: JSON.stringify({
        purchaseOrderId: orderId,
        reason
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel cancelar a compra.");
      return;
    }

    setReason("");
    startTransition(() => router.refresh());
  }

  if (!canCancel) {
    return <span className="text-xs text-slate-400">Sem acao</span>;
  }

  return (
    <form className="min-w-56 space-y-2" onSubmit={cancelOrder}>
      <Input
        className="h-9 text-xs"
        placeholder="Motivo do cancelamento"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button className="h-9 w-full px-3 text-xs" disabled={isPending} type="submit" variant="secondary">
        {isPending ? "Cancelando..." : "Cancelar compra"}
      </Button>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </form>
  );
}
