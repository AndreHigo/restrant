"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CashMovementType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";

export function CashMovementForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "SUPPLY" as CashMovementType,
    amount: formatCurrencyInput(0),
    reason: ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/operations/cash-register/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        amount: parseCurrencyInput(form.amount),
        reason: form.reason
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel registrar a movimentacao.");
      return;
    }

    setForm((current) => ({ ...current, amount: formatCurrencyInput(0), reason: "" }));
    startTransition(() => router.refresh());
  }

  return (
    <form className="grid gap-3 2xl:grid-cols-[0.8fr_0.7fr_1fr_auto]" onSubmit={onSubmit}>
      <select
        className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        value={form.type}
        onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CashMovementType }))}
      >
        <option value="SUPPLY">Suprimento</option>
        <option value="WITHDRAWAL">Sangria</option>
      </select>
      <Input
        className="h-12 px-4 text-[15px]"
        inputMode="numeric"
        placeholder="R$ 0,00"
        type="text"
        value={form.amount}
        onChange={(event) => setForm((current) => ({ ...current, amount: formatCurrencyInput(event.target.value) }))}
      />
      <Input
        className="h-12 px-4 text-[15px]"
        placeholder="Motivo"
        value={form.reason}
        onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
      />
      <Button className="h-12 text-[15px]" disabled={isPending} type="submit">
        {isPending ? "Lancando..." : "Lancar"}
      </Button>
      {error && <p className="text-xs text-red-600 lg:col-span-4">{error}</p>}
    </form>
  );
}
