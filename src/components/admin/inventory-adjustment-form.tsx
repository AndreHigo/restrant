"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";

type Option = {
  code?: string;
  currentStock: number;
  label: string;
  meta?: string;
  unit: string;
  value: string;
};

function quantity(value: number, unit: string) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${unit}`;
}

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
    countedStock: String(ingredients[0]?.currentStock ?? 0),
    reason: "Contagem manual"
  });

  const selectedIngredient = useMemo(
    () => ingredients.find((ingredient) => ingredient.value === form.ingredientId),
    [form.ingredientId, ingredients]
  );
  const countedStock = Number(form.countedStock || 0);
  const difference = selectedIngredient ? countedStock - selectedIngredient.currentStock : 0;
  const differenceLabel =
    difference === 0
      ? "Sem divergencia"
      : `${difference > 0 ? "+" : ""}${quantity(difference, selectedIngredient?.unit ?? "")}`;

  function selectIngredient(value: string) {
    const ingredient = ingredients.find((item) => item.value === value);
    setForm((current) => ({
      ...current,
      countedStock: String(ingredient?.currentStock ?? 0),
      ingredientId: value
    }));
  }

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
        <CodeLookupField
          emptyLabel="Nenhum insumo cadastrado"
          label="Insumo"
          options={ingredients}
          placeholder="Digite codigo ou nome do insumo"
          value={form.ingredientId}
          onChange={selectIngredient}
        />
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Saldo atual</span>
          <span className="font-medium text-slate-900">
            {selectedIngredient ? quantity(selectedIngredient.currentStock, selectedIngredient.unit) : "Selecione"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-slate-500">Diferenca prevista</span>
          <span className={difference < 0 ? "font-medium text-red-700" : "font-medium text-emerald-700"}>
            {differenceLabel}
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="inventory-counted-stock">
            Saldo contado
          </label>
          <Input
            id="inventory-counted-stock"
            min="0"
            step="0.001"
            type="number"
            value={form.countedStock}
            onChange={(event) => setForm((current) => ({ ...current, countedStock: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="inventory-unit">
            Unidade
          </label>
          <Input disabled id="inventory-unit" value={selectedIngredient?.unit ?? ""} />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="inventory-reason">
          Motivo
        </label>
        <Input
          id="inventory-reason"
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
