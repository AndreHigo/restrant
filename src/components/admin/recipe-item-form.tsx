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

export function RecipeItemForm({
  products,
  ingredients
}: {
  products: Option[];
  ingredients: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    productId: products[0]?.value ?? "",
    ingredientId: ingredients[0]?.value ?? "",
    quantity: "0.100"
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel salvar a ficha tecnica.");
      return;
    }

    setSuccess("Ficha tecnica atualizada.");
    startTransition(() => router.refresh());
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <CodeLookupField
          label="Produto"
          options={products}
          placeholder="Digite codigo ou nome do produto"
          value={form.productId}
          onChange={(value) => setForm((current) => ({ ...current, productId: value }))}
        />
      </div>
      <div>
        <CodeLookupField
          label="Insumo"
          options={ingredients}
          placeholder="Digite codigo ou nome do insumo"
          value={form.ingredientId}
          onChange={(value) => setForm((current) => ({ ...current, ingredientId: value }))}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Quantidade por item</label>
        <Input
          step="0.001"
          type="number"
          value={form.quantity}
          onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Salvar ficha tecnica"}
      </Button>
    </form>
  );
}
