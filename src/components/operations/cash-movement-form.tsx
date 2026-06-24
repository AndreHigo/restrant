"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CashMovementType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CashMovementForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "SUPPLY" as CashMovementType,
    amount: "0.00",
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
        amount: Number(form.amount),
        reason: form.reason
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel registrar a movimentacao.");
      return;
    }

    setForm((current) => ({ ...current, amount: "0.00", reason: "" }));
    startTransition(() => router.refresh());
  }

  return (
    <form className="grid gap-3 lg:grid-cols-[0.8fr_0.7fr_1fr_auto]" onSubmit={onSubmit}>
      <select
        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        value={form.type}
        onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CashMovementType }))}
      >
        <option value="SUPPLY">Suprimento</option>
        <option value="WITHDRAWAL">Sangria</option>
      </select>
      <Input
        min="0.01"
        step="0.01"
        type="number"
        value={form.amount}
        onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
      />
      <Input
        placeholder="Motivo"
        value={form.reason}
        onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
      />
      <Button disabled={isPending} type="submit">
        {isPending ? "Lancando..." : "Lancar"}
      </Button>
      {error && <p className="text-xs text-red-600 lg:col-span-4">{error}</p>}
    </form>
  );
}
