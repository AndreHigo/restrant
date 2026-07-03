"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

export function PaymentReconciliationForm({
  countedAmount,
  date,
  expectedAmount,
  method,
  notes
}: {
  countedAmount: number;
  date: string;
  expectedAmount: number;
  method: string;
  notes: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(formatCurrencyInput(countedAmount || expectedAmount));
  const [observation, setObservation] = useState(notes);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const parsedAmount = parseCurrencyInput(amount);
  const divergence = Number((parsedAmount - expectedAmount).toFixed(2));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/financial/reconciliation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countedAmount: parsedAmount,
        date,
        expectedAmount,
        method,
        notes: observation
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel conciliar a forma de pagamento.");
      return;
    }

    setSuccess("Conciliacao registrada.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3" onSubmit={onSubmit}>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Valor conferido</span>
          <Input
            className="h-10"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Observacao</span>
          <Input
            className="h-10"
            placeholder="Ex.: comprovantes conferidos"
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
          />
        </label>
        <Button className="h-10" disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Salvando..." : "Conciliar"}
        </Button>
      </div>
      <p className={divergence === 0 ? "text-xs text-emerald-700" : "text-xs text-amber-700"}>
        Diferenca: {divergence.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
    </form>
  );
}
