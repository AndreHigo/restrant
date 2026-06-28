"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderItemCancelFormProps = {
  salesOrderItemId: string;
};

export function OrderItemCancelForm({ salesOrderItemId }: OrderItemCancelFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/operations/orders/items/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderItemId,
        cancelReason: reason
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel cancelar o item.");
      return;
    }

    setReason("");
    startTransition(() => router.refresh());
  }

  return (
    <form className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
      <Input
        className="h-10 text-sm"
        placeholder="Motivo para cancelar item"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button className="h-10" disabled={isPending} type="submit" variant="ghost">
        {isPending ? "Cancelando..." : "Cancelar item"}
      </Button>
      {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
    </form>
  );
}
