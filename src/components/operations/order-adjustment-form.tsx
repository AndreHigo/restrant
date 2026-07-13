"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

type OrderAdjustmentFormProps = {
  salesOrderId: string;
  subtotal: number;
  discount: number;
  serviceCharge: number;
};

export function OrderAdjustmentForm({
  salesOrderId,
  subtotal,
  discount,
  serviceCharge
}: OrderAdjustmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    discount: formatCurrencyInput(discount),
    serviceCharge: formatCurrencyInput(serviceCharge),
    reason: ""
  });

  const previewTotal = useMemo(() => {
    const nextDiscount = parseCurrencyInput(form.discount);
    const nextServiceCharge = parseCurrencyInput(form.serviceCharge);

    return Math.max(0, Number((subtotal - nextDiscount + nextServiceCharge).toFixed(2)));
  }, [form.discount, form.serviceCharge, subtotal]);

  function setServiceChargePercent(percent: number) {
    setForm((current) => ({
      ...current,
      serviceCharge: formatCurrencyInput(Number((subtotal * percent).toFixed(2)))
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/operations/orders/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesOrderId,
        discount: parseCurrencyInput(form.discount),
        serviceCharge: parseCurrencyInput(form.serviceCharge),
        reason: form.reason
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel ajustar o pedido.");
      return;
    }

    setSuccess("Ajuste aplicado ao pedido.");
    setForm((current) => ({ ...current, reason: "" }));
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
      <div className="grid gap-3 2xl:grid-cols-[0.7fr_0.7fr_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Desconto</span>
          <Input
            className="h-11 text-sm"
            inputMode="numeric"
            placeholder="R$ 0,00"
            type="text"
            value={form.discount}
            onChange={(event) =>
              setForm((current) => ({ ...current, discount: formatCurrencyInput(event.target.value) }))
            }
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Taxa</span>
          <Input
            className="h-11 text-sm"
            inputMode="numeric"
            placeholder="R$ 0,00"
            type="text"
            value={form.serviceCharge}
            onChange={(event) =>
              setForm((current) => ({ ...current, serviceCharge: formatCurrencyInput(event.target.value) }))
            }
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Motivo</span>
          <Input
            className="h-11 text-sm"
            placeholder="Ex.: cortesia autorizada ou taxa de servico"
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          />
        </label>
        <div className="flex items-end">
          <Button className="h-11 w-full" disabled={isPending} type="submit" variant="secondary">
            {isPending ? "Aplicando..." : "Aplicar ajuste"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={() => setServiceChargePercent(0.1)}
        >
          Taxa 10%
        </button>
        <button
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={() => setForm((current) => ({ ...current, discount: formatCurrencyInput(0) }))}
        >
          Zerar desconto
        </button>
        <button
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={() => setForm((current) => ({ ...current, serviceCharge: formatCurrencyInput(0) }))}
        >
          Zerar taxa
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Ajuste auditado por permissao de vendas</span>
        <span>
          Total previsto:{" "}
          <strong className="text-slate-900">
            {previewTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </strong>
        </span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
    </form>
  );
}
