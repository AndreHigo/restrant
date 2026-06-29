"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

type CashRegisterCloseFormProps = {
  expectedAmount: number;
};

export function CashRegisterCloseForm({ expectedAmount }: CashRegisterCloseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    closingAmount: formatCurrencyInput(expectedAmount),
    notes: ""
  });

  const divergence = useMemo(() => {
    const counted = parseCurrencyInput(form.closingAmount);
    if (Number.isNaN(counted)) {
      return 0;
    }

    return Number((counted - expectedAmount).toFixed(2));
  }, [expectedAmount, form.closingAmount]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/operations/cash-register/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closingAmount: parseCurrencyInput(form.closingAmount),
        notes: form.notes
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel fechar o caixa.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <form className="grid gap-3 2xl:grid-cols-[0.7fr_0.7fr_1fr_auto]" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          Valor contado
        </label>
        <Input
          className="h-12 px-4 text-[15px]"
          inputMode="numeric"
          placeholder="R$ 0,00"
          type="text"
          value={form.closingAmount}
          onChange={(event) =>
            setForm((current) => ({ ...current, closingAmount: formatCurrencyInput(event.target.value) }))
          }
        />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Diferenca</p>
        <div
          className={
            divergence === 0
              ? "flex h-12 items-center rounded-lg border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-700"
              : divergence > 0
                ? "flex h-12 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-[15px] font-medium text-emerald-700"
                : "flex h-12 items-center rounded-lg border border-red-200 bg-red-50 px-4 text-[15px] font-medium text-red-700"
          }
        >
          {divergence.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          Observacao
        </label>
        <Input
          className="h-12 px-4 text-[15px]"
          placeholder="Conferencia, divergencia ou observacao"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>
      <div className="flex items-end">
        <Button className="h-12 w-full text-[15px]" disabled={isPending} type="submit">
          {isPending ? "Fechando..." : "Fechar caixa"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 lg:col-span-4">{error}</p>}
    </form>
  );
}
