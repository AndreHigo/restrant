"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

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
      amount: formatCurrencyInput(suggestedAmount)
    }
  ]);

  const splitTotal = entries.reduce((sum, entry) => sum + parseCurrencyInput(entry.amount), 0);
  const splitDifference = Number((suggestedAmount - splitTotal).toFixed(2));

  function updateEntry(index: number, key: keyof PaymentEntry, value: string) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry
      )
    );
  }

  function fillRemaining(index: number) {
    const otherEntriesTotal = entries.reduce(
      (sum, entry, entryIndex) => (entryIndex === index ? sum : sum + parseCurrencyInput(entry.amount)),
      0
    );
    const remaining = Math.max(0, Number((suggestedAmount - otherEntriesTotal).toFixed(2)));
    updateEntry(index, "amount", formatCurrencyInput(remaining));
  }

  function splitInHalf() {
    const firstMethod = methods[0]?.value ?? "PIX";
    const secondMethod = methods[1]?.value ?? firstMethod;
    const firstAmount = Number((suggestedAmount / 2).toFixed(2));
    const secondAmount = Number((suggestedAmount - firstAmount).toFixed(2));

    setEntries([
      { method: firstMethod, amount: formatCurrencyInput(firstAmount) },
      { method: secondMethod, amount: formatCurrencyInput(secondAmount) }
    ]);
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
          amount: parseCurrencyInput(entry.amount)
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
        amount: formatCurrencyInput(0)
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

      <form className="space-y-4" onSubmit={onSubmit}>
        {entries.map((entry, index) => (
          <div key={`${index}-${entry.method}`} className="grid gap-3 2xl:grid-cols-[1fr_0.8fr_auto_auto]">
            <select
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
              className="h-12 px-4 text-[15px]"
              inputMode="numeric"
              placeholder="R$ 0,00"
              type="text"
              value={entry.amount}
              onChange={(event) => updateEntry(index, "amount", formatCurrencyInput(event.target.value))}
            />
            <Button className="h-12" type="button" variant="secondary" onClick={() => fillRemaining(index)}>
              Restante
            </Button>
            <Button
              className="h-12"
              disabled={entries.length === 1}
              type="button"
              variant="ghost"
              onClick={() => setEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))}
            >
              Remover
            </Button>
          </div>
        ))}

        <div className="grid gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm lg:grid-cols-[auto_auto_1fr] lg:items-center">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-100 bg-white px-3 font-medium text-brand-800 transition hover:bg-brand-50"
            type="button"
            onClick={() =>
              setEntries((current) => [
                ...current,
                { method: methods[0]?.value ?? "PIX", amount: formatCurrencyInput(0) }
              ])
            }
          >
            + Dividir pagamento
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-700 transition hover:bg-slate-100"
            type="button"
            onClick={splitInHalf}
          >
            Dividir em 2
          </button>
          <span className="font-medium text-slate-700 lg:text-right">
            Total desta divisao:{" "}
            {splitTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>

        {splitDifference !== 0 && (
          <div
            className={
              splitDifference > 0
                ? "rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
                : "rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
            }
          >
            {splitDifference > 0 ? "Falta registrar " : "Valor excede o saldo em "}
            {Math.abs(splitDifference).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.
          </div>
        )}

        <div className="grid gap-2 text-sm text-slate-500 lg:grid-cols-[auto_1fr] lg:items-center">
          <span>Saldo sugerido: {suggestedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <span className="lg:text-right">Use varias linhas para combinar PIX, cartao, dinheiro e outros meios.</span>
        </div>

        <Button className="h-12 w-full text-[15px]" disabled={isPending} type="submit">
          {isPending ? "Registrando..." : entries.length > 1 ? "Registrar divisao" : "Registrar pagamento"}
        </Button>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-700">{success}</p>}
      </form>
    </div>
  );
}
