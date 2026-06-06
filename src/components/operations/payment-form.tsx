"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentEntry = {
  method: PaymentMethodType;
  amount: string;
};

export function PaymentForm({
  salesOrderId,
  suggestedAmount,
  methods,
  existingPayments
}: {
  salesOrderId: string;
  suggestedAmount: number;
  methods: Array<{ label: string; value: PaymentMethodType }>;
  existingPayments: Array<{ id: string; methodLabel: string; amount: number; paidAt: string | null }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [entries, setEntries] = useState<PaymentEntry[]>([
    {
      method: methods[0]?.value ?? "PIX",
      amount: suggestedAmount.toFixed(2)
    }
  ]);

  const splitTotal = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  function updateEntry(index: number, key: keyof PaymentEntry, value: string) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry
      )
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/operations/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderId,
        payments: entries.map((entry) => ({
          method: entry.method,
          amount: Number(entry.amount)
        }))
      })
    });

    const payload = (await response.json()) as { error?: string; payments?: unknown[] };
    if (!response.ok) {
      setError(payload.error ?? "Falha ao registrar pagamento.");
      return;
    }

    setEntries([
      {
        method: methods[0]?.value ?? "PIX",
        amount: "0.00"
      }
    ]);
    setSuccess(entries.length > 1 ? "Pagamentos divididos registrados." : "Pagamento registrado.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {existingPayments.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pagamentos lancados</p>
          <div className="mt-2 space-y-2">
            {existingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <span>{payment.methodLabel}</span>
                <span>
                  {payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form className="space-y-3" onSubmit={onSubmit}>
        {entries.map((entry, index) => (
          <div key={`${index}-${entry.method}`} className="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]">
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={entry.method}
              onChange={(event) => updateEntry(index, "method", event.target.value)}
            >
              {methods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            <Input
              step="0.01"
              type="number"
              value={entry.amount}
              onChange={(event) => updateEntry(index, "amount", event.target.value)}
            />
            <Button
              disabled={entries.length === 1}
              type="button"
              variant="ghost"
              onClick={() => setEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))}
            >
              Remover
            </Button>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <button
            className="text-brand-700"
            type="button"
            onClick={() =>
              setEntries((current) => [
                ...current,
                { method: methods[0]?.value ?? "PIX", amount: "0.00" }
              ])
            }
          >
            + Dividir pagamento
          </button>
          <span className="font-medium text-slate-700">
            Total desta divisao:{" "}
            {splitTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Saldo sugerido: {suggestedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <span>Use varias linhas para combinar PIX, cartao, dinheiro e outros meios.</span>
        </div>

        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? "Registrando..." : entries.length > 1 ? "Registrar divisao" : "Registrar pagamento"}
        </Button>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-700">{success}</p>}
      </form>
    </div>
  );
}
