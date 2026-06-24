"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderCancelFormProps = {
  salesOrderId: string;
};

export function OrderCancelForm({ salesOrderId }: OrderCancelFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/operations/cash-register/orders/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderId,
        cancelReason: reason
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel cancelar o pedido.");
      return;
    }

    setReason("");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="Motivo do cancelamento"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button disabled={isPending} type="submit" variant="ghost">
          {isPending ? "Cancelando..." : "Cancelar pedido"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
