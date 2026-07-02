"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderItemTransferFormProps = {
  currentTabCode: string;
  salesOrderItemId: string;
};

export function OrderItemTransferForm({ currentTabCode, salesOrderItemId }: OrderItemTransferFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [targetTabCode, setTargetTabCode] = useState("");
  const [reason, setReason] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanTarget = targetTabCode.replace(/\D/g, "");

    if (!cleanTarget) {
      setError("Informe a comanda de destino.");
      return;
    }

    if (cleanTarget === currentTabCode) {
      setError("A comanda de destino deve ser diferente da atual.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/operations/orders/items/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderItemId,
        targetTabCode: cleanTarget,
        reason
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel transferir o item.");
      setIsSubmitting(false);
      return;
    }

    setTargetTabCode("");
    setReason("");
    setIsSubmitting(false);
    startTransition(() => router.refresh());
  }

  return (
    <form className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3" onSubmit={onSubmit}>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-blue-800">Transferir item</p>
      <div className="grid gap-2 sm:grid-cols-[130px_1fr_auto]">
        <Input
          className="h-10 text-sm"
          inputMode="numeric"
          placeholder="Comanda destino"
          value={targetTabCode}
          onChange={(event) => setTargetTabCode(event.target.value.replace(/\D/g, ""))}
        />
        <Input
          className="h-10 text-sm"
          placeholder="Motivo da transferencia"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button className="h-10" disabled={isSubmitting || isPending} type="submit" variant="secondary">
          {isSubmitting || isPending ? "Transferindo..." : "Transferir"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
