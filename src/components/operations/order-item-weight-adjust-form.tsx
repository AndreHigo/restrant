"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderItemWeightAdjustFormProps = {
  currentWeightKg: number;
  salesOrderItemId: string;
};

export function OrderItemWeightAdjustForm({ currentWeightKg, salesOrderItemId }: OrderItemWeightAdjustFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [weightKg, setWeightKg] = useState(currentWeightKg > 0 ? currentWeightKg.toFixed(3) : "");
  const [reason, setReason] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/operations/orders/items/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderItemId,
        weightKg: Number(weightKg),
        reason
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel ajustar o peso.");
      return;
    }

    setReason("");
    startTransition(() => router.refresh());
  }

  return (
    <form className="mt-3 grid gap-2 rounded-lg bg-amber-50/70 p-3 sm:grid-cols-[120px_1fr_auto]" onSubmit={onSubmit}>
      <Input
        className="h-10 text-sm"
        inputMode="decimal"
        min="0.001"
        step="0.001"
        type="number"
        value={weightKg}
        onChange={(event) => setWeightKg(event.target.value)}
      />
      <Input
        className="h-10 text-sm"
        placeholder="Motivo do ajuste"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button className="h-10" disabled={isPending} type="submit" variant="secondary">
        {isPending ? "Ajustando..." : "Ajustar peso"}
      </Button>
      {error && <p className="text-xs text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}
