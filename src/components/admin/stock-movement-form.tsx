"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";

type Option = {
  code?: string;
  label: string;
  meta?: string;
  value: string;
};

export function StockMovementForm({
  ingredients
}: {
  ingredients: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    ingredientId: ingredients[0]?.value ?? "",
    type: "IN",
    quantity: "0",
    unitCost: "",
    reason: "",
    referenceType: "",
    referenceId: ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/stock/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel registrar a movimentacao.");
      return;
    }

    setSuccess("Movimentacao registrada.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <CodeLookupField
          label="Insumo"
          options={ingredients}
          placeholder="Digite codigo ou nome do insumo"
          value={form.ingredientId}
          onChange={(value) => setForm((current) => ({ ...current, ingredientId: value }))}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="IN">Entrada</option>
            <option value="OUT">Saida</option>
            <option value="PURCHASE">Compra</option>
            <option value="LOSS">Perda</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Quantidade</label>
          <Input
            step="0.001"
            type="number"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Custo unitario</label>
          <Input
            step="0.01"
            type="number"
            value={form.unitCost}
            onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Motivo</label>
          <Input
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          />
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Registrar movimentacao"}
      </Button>
    </form>
  );
}
