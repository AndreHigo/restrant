"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrderCancelForm({
  salesOrderId
}: {
  salesOrderId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/operations/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderId,
        status: "CANCELED",
        cancelReason: reason
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel cancelar o pedido.");
      return;
    }

    setOpen(false);
    setReason("");
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Cancelar
      </Button>
    );
  }

  return (
    <form className="mt-3 space-y-3 rounded-lg border border-red-200 bg-red-50 p-3" onSubmit={onSubmit}>
      <Input
        placeholder="Motivo do cancelamento"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Cancelando..." : "Confirmar cancelamento"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Voltar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
