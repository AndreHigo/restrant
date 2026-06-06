"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = {
  label: string;
  value: string;
};

export function InventoryAdjustmentForm({
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
    countedStock: "0",
    reason: "Contagem manual"
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/stock/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel ajustar o inventario.");
      return;
    }

    setSuccess("Inventario aplicado.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Insumo</label>
        <select
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          value={form.ingredientId}
          onChange={(event) => setForm((current) => ({ ...current, ingredientId: event.target.value }))}
        >
          {ingredients.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Saldo contado</label>
        <Input
          step="0.001"
          type="number"
          value={form.countedStock}
          onChange={(event) => setForm((current) => ({ ...current, countedStock: event.target.value }))}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Motivo</label>
        <Input
          value={form.reason}
          onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Aplicando..." : "Aplicar inventario"}
      </Button>
    </form>
  );
}
