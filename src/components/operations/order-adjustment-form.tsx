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
        <Input
          className="h-11 text-sm"
          placeholder="Motivo do desconto ou taxa"
          value={form.reason}
          onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
        />
        <Button className="h-11" disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Aplicando..." : "Aplicar ajuste"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Desconto | Taxa de servico</span>
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
