"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentRefundForm({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/operations/payments/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId,
        reason
      })
    });

    const payload = (await response.json()) as {
      error?: string;
      stockReturn?: {
        alreadyReturned: boolean;
        ingredientMovements: number;
        productAdjustments: number;
      } | null;
    };
    if (!response.ok) {
      setError(payload.error ?? "Falha ao estornar pagamento.");
      return;
    }

    setReason("");
    setSuccess(
      payload.stockReturn && !payload.stockReturn.alreadyReturned
        ? "Pagamento estornado e estoque retornado."
        : "Pagamento estornado."
    );
    startTransition(() => router.refresh());
  }

  return (
    <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
      <Input
        className="h-10"
        minLength={5}
        placeholder="Motivo do estorno"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button className="h-10" disabled={isPending || reason.trim().length < 5} type="submit" variant="secondary">
        {isPending ? "Estornando..." : "Estornar"}
      </Button>
      {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
      {success && <p className="text-xs text-emerald-700 sm:col-span-2">{success}</p>}
    </form>
  );
}
