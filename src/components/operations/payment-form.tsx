"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodType } from "@prisma/client";
import { PaymentRefundForm } from "@/components/operations/payment-refund-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

type PaymentEntry = {
  method: PaymentMethodType;
  amount: string;
};

type PaymentItemReference = {
  id: string;
  label: string;
  amount: number;
};

export function PaymentForm({
  salesOrderId,
  suggestedAmount,
  methods,
  existingPayments,
  itemReferences = [],
  allowPartialPayments = true,
  allowNewPayment = true
}: {
  salesOrderId: string;
  suggestedAmount: number;
  methods: Array<{ label: string; value: PaymentMethodType }>;
  existingPayments: Array<{
    id: string;
    methodLabel: string;
    amount: number;
    status: string;
    statusLabel: string;
    paidAt: string | null;
  }>;
  itemReferences?: PaymentItemReference[];
  allowPartialPayments?: boolean;
  allowNewPayment?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [entries, setEntries] = useState<PaymentEntry[]>([
    {
      method: methods[0]?.value ?? "PIX",
      amount: formatCurrencyInput(suggestedAmount)
    }
  ]);

  const splitTotal = entries.reduce((sum, entry) => sum + parseCurrencyInput(entry.amount), 0);
  const splitDifference = Number((suggestedAmount - splitTotal).toFixed(2));
  const canAddSplitRows = allowPartialPayments;
  const selectedItemTotal = itemReferences
    .filter((item) => selectedItemIds.includes(item.id))
    .reduce((sum, item) => sum + item.amount, 0);

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
    splitByPeople(2);
  }

  function splitByPeople(peopleCount: number) {
    const count = Math.max(1, peopleCount);
    const baseAmount = Math.floor((suggestedAmount / count) * 100) / 100;
    let allocated = 0;

    setEntries(
      Array.from({ length: count }, (_, index) => {
        const amount =
          index === count - 1
            ? Number((suggestedAmount - allocated).toFixed(2))
            : baseAmount;
        allocated = Number((allocated + amount).toFixed(2));

        return {
          method: methods[index]?.value ?? methods[0]?.value ?? "PIX",
          amount: formatCurrencyInput(amount)
        };
      })
    );
  }

  function toggleItem(itemId: string) {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((selectedId) => selectedId !== itemId)
        : [...current, itemId]
    );
  }

  function applySelectedItemsTotal() {
    if (selectedItemTotal <= 0) {
      return;
    }

    setEntries([
      {
        method: methods[0]?.value ?? "PIX",
        amount: formatCurrencyInput(Math.min(selectedItemTotal, suggestedAmount))
      }
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
              <div key={payment.id} className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
                  <span className="font-medium">{payment.methodLabel}</span>
                  <span className={payment.status === "REFUNDED" ? "text-red-700 line-through" : "text-slate-900"}>
                    {payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {payment.statusLabel}
                  </span>
                </div>
                {payment.status === "PAID" && <PaymentRefundForm paymentId={payment.id} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {!allowNewPayment ? null : (
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

        {canAddSplitRows && itemReferences.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Dividir por itens</p>
                <p className="mt-1 text-xs text-slate-500">
                  Selecione itens para calcular um pagamento parcial por consumo.
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {selectedItemTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
              {itemReferences.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);

                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50"
                  >
                    <input
                      checked={isSelected}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      type="checkbox"
                      onChange={() => toggleItem(item.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{item.label}</span>
                      <span className="mt-1 block text-slate-500">
                        {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              className="mt-3 h-10 w-full rounded-lg border border-brand-100 bg-brand-50 px-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
              disabled={selectedItemTotal <= 0}
              type="button"
              onClick={applySelectedItemsTotal}
            >
              Aplicar total selecionado
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm lg:grid-cols-[auto_auto_1fr] lg:items-center">
          {canAddSplitRows ? (
            <>
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
            </>
          ) : (
            <span className="rounded-lg bg-white px-3 py-2 font-medium text-slate-700 lg:col-span-2">
              Pagamento parcial desativado
            </span>
          )}
          <span className="font-medium text-slate-700 lg:text-right">
            Total desta divisao:{" "}
            {splitTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>

        {canAddSplitRows ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Dividir por pessoas</p>
                <p className="mt-1 text-xs text-slate-500">
                  Gera parcelas iguais e ajusta centavos na ultima linha.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:flex">
                {[2, 3, 4, 5].map((peopleCount) => (
                  <button
                    key={peopleCount}
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    type="button"
                    onClick={() => splitByPeople(peopleCount)}
                  >
                    {peopleCount}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

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
          <span className="lg:text-right">
            {allowPartialPayments
              ? "Use varias linhas para combinar PIX, cartao, dinheiro e outros meios."
              : "A configuracao atual exige quitar o saldo total em uma unica cobranca."}
          </span>
        </div>

        <Button className="h-12 w-full text-[15px]" disabled={isPending} type="submit">
          {isPending ? "Registrando..." : entries.length > 1 ? "Registrar divisao" : "Registrar pagamento"}
        </Button>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-700">{success}</p>}
      </form>
      )}
    </div>
  );
}
