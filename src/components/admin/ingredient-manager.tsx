"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, CalendarClock, PackageCheck, Plus, Search, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type IngredientListItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  cost: number | null;
  minimumStock: number | null;
  currentStock: number | null;
  expiresAt: string;
  belowMinimum: boolean;
  expired: boolean;
  expiringSoon: boolean;
  stockValue: number;
  coverageRatio: number | null;
};

type FormState = {
  sku: string;
  name: string;
  unit: string;
  cost: string;
  minimumStock: string;
  currentStock: string;
  expiresAt: string;
};

const initialFormState: FormState = {
  sku: "",
  name: "",
  unit: "KG",
  cost: "0",
  minimumStock: "0",
  currentStock: "0",
  expiresAt: ""
};

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function quantity(value: number | null | undefined, unit: string) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 3
  })} ${unit}`;
}

function formatDate(value: string) {
  if (!value) {
    return "Sem validade";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function getStatus(item: IngredientListItem) {
  if (item.expired) {
    return { label: "Vencido", className: "border-red-200 bg-red-50 text-red-700" };
  }

  if (item.belowMinimum) {
    return { label: "Estoque baixo", className: "border-amber-200 bg-amber-50 text-amber-800" };
  }

  if (item.expiringSoon) {
    return { label: "Vencendo", className: "border-amber-200 bg-amber-50 text-amber-800" };
  }

  return { label: "Normal", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

export function IngredientManager({
  initialQuery,
  items
}: {
  initialQuery: string;
  items: IngredientListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const summary = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + item.stockValue, 0);
    return {
      total: items.length,
      lowStock: items.filter((item) => item.belowMinimum).length,
      expiring: items.filter((item) => item.expiringSoon || item.expired).length,
      totalValue
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.sku, item.unit].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [items, query]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/admin/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState)
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel salvar o insumo.");
      return;
    }

    setSuccess("Insumo salvo com sucesso.");
    setFormState(initialFormState);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Insumos cadastrados</p>
            <PackageCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Abaixo do minimo</p>
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{summary.lowStock}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Validade critica</p>
            <CalendarClock className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.expiring}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Valor em estoque</p>
            <WalletCards className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{money(summary.totalValue)}</p>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-950">Base de insumos</h3>
                  <Badge tone="success">Ficha tecnica e CMV</Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Cadastre a materia-prima usada nas receitas. Saldo, validade e perdas devem evoluir pelas
                  movimentacoes de estoque.
                </p>
              </div>
              <form action="/admin/insumos" className="flex w-full gap-2 xl:w-96">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    name="q"
                    placeholder="Buscar insumo"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onInput={(event) => setQuery(event.currentTarget.value)}
                  />
                </label>
                <Button className="shrink-0 px-3" type="submit" variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Insumo</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Saldo</th>
                  <th className="px-6 py-3 font-semibold">Minimo</th>
                  <th className="px-6 py-3 font-semibold">Custo</th>
                  <th className="px-6 py-3 font-semibold">Validade</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = getStatus(item);

                  return (
                    <tr key={item.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-950">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.sku} - unidade {item.unit}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <p className="font-medium text-slate-900">{quantity(item.currentStock, item.unit)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Cobertura {item.coverageRatio === null ? "n/a" : `${item.coverageRatio}x`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{quantity(item.minimumStock, item.unit)}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <p>{money(item.cost)}</p>
                        <p className="mt-1 text-xs text-slate-500">Total {money(item.stockValue)}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{formatDate(item.expiresAt)}</td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                      Nenhum insumo encontrado para a busca atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Novo insumo</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Use para cadastrar materia-prima. Ajuste real de saldo deve ser feito no estoque/inventario.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">SKU</span>
                <Input
                  placeholder="ING-100"
                  value={formState.sku}
                  onChange={(event) => setFormState((current) => ({ ...current, sku: event.target.value }))}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Unidade</span>
                <Input
                  placeholder="KG"
                  value={formState.unit}
                  onChange={(event) => setFormState((current) => ({ ...current, unit: event.target.value }))}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Nome do insumo</span>
              <Input
                placeholder="Arroz, feijao, carne, salada..."
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm font-semibold text-slate-900">Parametros de estoque</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Custo unitario</span>
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    value={formState.cost}
                    onChange={(event) => setFormState((current) => ({ ...current, cost: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Estoque minimo</span>
                  <Input
                    min="0"
                    step="0.001"
                    type="number"
                    value={formState.minimumStock}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, minimumStock: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Saldo inicial</span>
                  <Input
                    min="0"
                    step="0.001"
                    type="number"
                    value={formState.currentStock}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, currentStock: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Validade</span>
                  <Input
                    type="date"
                    value={formState.expiresAt}
                    onChange={(event) => setFormState((current) => ({ ...current, expiresAt: event.target.value }))}
                  />
                </label>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

            <Button className="h-12 w-full" disabled={isPending} type="submit">
              {isPending ? "Salvando..." : "Salvar insumo"}
            </Button>
          </form>
        </aside>
      </section>
    </div>
  );
}
