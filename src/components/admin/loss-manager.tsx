"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ClipboardList, PackageMinus, Search, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeLookupField } from "@/components/ui/code-lookup-field";
import { Input } from "@/components/ui/input";

type LossIngredient = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  cost: number;
  currentStock: number;
};

type LossItem = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  ingredientSku: string;
  ingredientUnit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  referenceType: string;
  createdAt: string;
};

type LossOverview = {
  ingredients: LossIngredient[];
  kpis: {
    lossesCount: number;
    monthLossesCount: number;
    totalLossValue: number;
    monthLossValue: number;
  };
  losses: LossItem[];
};

const reasonOptions = [
  "Validade vencida",
  "Sobra de buffet",
  "Erro de preparo",
  "Produto danificado",
  "Quebra operacional",
  "Contagem divergente"
];

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function quantity(value: number, unit: string) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${unit}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

export function LossManager({ overview }: { overview: LossOverview }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    ingredientId: overview.ingredients[0]?.id ?? "",
    quantity: "0",
    unitCost: String(overview.ingredients[0]?.cost ?? 0),
    reason: reasonOptions[0],
    notes: ""
  });

  const selectedIngredient = useMemo(
    () => overview.ingredients.find((ingredient) => ingredient.id === form.ingredientId),
    [form.ingredientId, overview.ingredients]
  );
  const quantityValue = Number(form.quantity || 0);
  const unitCostValue = Number(form.unitCost || 0);
  const totalPreview = Number((quantityValue * unitCostValue).toFixed(2));
  const ingredientOptions = overview.ingredients.map((ingredient) => ({
    code: ingredient.sku,
    label: ingredient.name,
    meta: `${quantity(ingredient.currentStock, ingredient.unit)} em estoque`,
    value: ingredient.id
  }));

  const filteredLosses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return overview.losses;
    }

    return overview.losses.filter((loss) =>
      [loss.ingredientName, loss.ingredientSku, loss.reason, loss.referenceType].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [overview.losses, query]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/stock/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientId: form.ingredientId,
        quantity: form.quantity,
        reason: form.notes ? `${form.reason} - ${form.notes}` : form.reason,
        referenceType: "loss",
        type: "LOSS",
        unitCost: form.unitCost
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel registrar a perda.");
      return;
    }

    setSuccess("Perda registrada e estoque baixado.");
    setForm((current) => ({
      ...current,
      notes: "",
      quantity: "0"
    }));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Perdas registradas</p>
            <PackageMinus className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.kpis.lossesCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Perdas no mes</p>
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{overview.kpis.monthLossesCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Valor no mes</p>
            <WalletCards className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{money(overview.kpis.monthLossValue)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Valor historico</p>
            <ClipboardList className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{money(overview.kpis.totalLossValue)}</p>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-950">Perdas e desperdicio</h3>
                  <Badge tone="warning">Baixa auditada</Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Registre perdas de insumos para baixar estoque e medir desperdicio por motivo.
                </p>
              </div>
              <label className="relative w-full xl:w-96">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar perda por insumo ou motivo"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Insumo</th>
                  <th className="px-4 py-3 font-semibold">Quantidade</th>
                  <th className="px-4 py-3 font-semibold">Custo</th>
                  <th className="px-4 py-3 font-semibold">Motivo</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLosses.map((loss) => (
                  <tr key={loss.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-950">{loss.ingredientName}</p>
                      <p className="mt-1 text-xs text-slate-500">{loss.ingredientSku}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {quantity(loss.quantity, loss.ingredientUnit)}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <p className="font-medium text-slate-900">{money(loss.totalCost)}</p>
                      <p className="mt-1 text-xs text-slate-500">{money(loss.unitCost)} / {loss.ingredientUnit}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{loss.reason || "Sem motivo"}</td>
                    <td className="px-4 py-4 text-slate-700">{formatDateTime(loss.createdAt)}</td>
                  </tr>
                ))}
                {filteredLosses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      Nenhuma perda encontrada para a busca atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <PackageMinus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Registrar perda</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                A quantidade informada sera baixada do estoque do insumo selecionado.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <CodeLookupField
                emptyLabel="Nenhum insumo cadastrado"
                label="Insumo"
                options={ingredientOptions}
                placeholder="Digite codigo ou nome do insumo"
                value={form.ingredientId}
                onChange={(value) => {
                  const ingredient = overview.ingredients.find((item) => item.id === value);
                  setForm((current) => ({
                    ...current,
                    ingredientId: value,
                    unitCost: String(ingredient?.cost ?? 0)
                  }));
                }}
              />
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Saldo atual</span>
                <span className="font-medium text-slate-900">
                  {selectedIngredient ? quantity(selectedIngredient.currentStock, selectedIngredient.unit) : "Selecione"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-slate-500">Valor previsto</span>
                <span className="font-medium text-amber-700">{money(totalPreview)}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Quantidade perdida</span>
                <Input
                  min="0"
                  step="0.001"
                  type="number"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Custo unitario</span>
                <Input
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.unitCost}
                  onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Motivo</span>
              <select
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              >
                {reasonOptions.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Observacao</span>
              <Input
                placeholder="Ex.: bandeja descartada no fim do almoco"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

            <Button className="h-12 w-full" disabled={isPending || overview.ingredients.length === 0} type="submit">
              {isPending ? "Registrando..." : "Registrar perda"}
            </Button>
          </form>
        </aside>
      </section>
    </div>
  );
}
