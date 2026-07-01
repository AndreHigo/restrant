"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, ClipboardList, Search, TriangleAlert, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryAdjustmentForm } from "@/components/admin/inventory-adjustment-form";

type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  cost: number;
  currentStock: number;
  minimumStock: number;
  expiresAt: string;
  belowMinimum: boolean;
  expired: boolean;
  expiringSoon: boolean;
  coverageRatio: number | null;
  latestMovement: {
    type: string;
    quantity: number;
    createdAt: string;
  } | null;
};

type InventoryOverview = {
  kpis: {
    ingredientsCount: number;
    lowStockCount: number;
    totalValue: number;
    expiringCount: number;
    expiredCount: number;
  };
  items: InventoryItem[];
};

type InventoryFilter = "all" | "recount" | "validity" | "healthy";

const movementLabels: Record<string, string> = {
  IN: "Entrada",
  OUT: "Saida",
  PURCHASE: "Compra",
  LOSS: "Perda",
  ADJUSTMENT: "Ajuste",
  INVENTORY: "Inventario",
  SALE: "Venda"
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function quantity(value: number, unit: string) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${unit}`;
}

function formatDate(value: string) {
  if (!value) {
    return "Sem validade";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function getStatus(item: InventoryItem) {
  if (item.expired) {
    return { label: "Vencido", tone: "warning" as const };
  }

  if (item.belowMinimum) {
    return { label: "Recontar", tone: "warning" as const };
  }

  if (item.expiringSoon) {
    return { label: "Validade", tone: "default" as const };
  }

  return { label: "Conferido", tone: "success" as const };
}

export function InventoryManager({ overview }: { overview: InventoryOverview }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("all");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return overview.items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.sku, item.unit].some((value) => value.toLowerCase().includes(normalizedQuery));

      if (!matchesQuery) {
        return false;
      }

      if (filter === "recount") {
        return item.belowMinimum;
      }

      if (filter === "validity") {
        return item.expired || item.expiringSoon;
      }

      if (filter === "healthy") {
        return !item.belowMinimum && !item.expired && !item.expiringSoon;
      }

      return true;
    });
  }, [filter, overview.items, query]);

  const criticalItems = overview.items.filter((item) => item.belowMinimum || item.expiringSoon || item.expired);
  const criticalCount = criticalItems.length;
  const filterOptions: Array<{ label: string; value: InventoryFilter; count: number }> = [
    { label: "Todos", value: "all", count: overview.items.length },
    { label: "Recontar", value: "recount", count: overview.kpis.lowStockCount },
    { label: "Validade", value: "validity", count: overview.items.filter((item) => item.expiringSoon || item.expired).length },
    {
      label: "Conferidos",
      value: "healthy",
      count: overview.items.filter((item) => !item.belowMinimum && !item.expired && !item.expiringSoon).length
    }
  ];

  const ingredientOptions = overview.items.map((item) => ({
    code: item.sku,
    currentStock: item.currentStock,
    label: item.name,
    meta: `${quantity(item.currentStock, item.unit)} em estoque`,
    unit: item.unit,
    value: item.id
  }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Itens para contagem</p>
            <ClipboardList className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.kpis.ingredientsCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Itens criticos</p>
            <TriangleAlert className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{criticalCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Valor inventariado</p>
            <WalletCards className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{money(overview.kpis.totalValue)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Sem alerta</p>
            <ClipboardCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {overview.items.length - criticalCount}
          </p>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-950">Inventario fisico</h3>
                  <Badge tone="success">Ajuste auditado</Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Conte o estoque fisico, compare com o saldo do sistema e aplique ajustes com trilha de auditoria.
                </p>
              </div>
              <label className="relative w-full xl:w-96">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar insumo no inventario"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  className="h-9"
                  type="button"
                  variant={filter === option.value ? "primary" : "secondary"}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label} ({option.count})
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Insumo</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Saldo sistema</th>
                  <th className="px-4 py-3 font-semibold">Minimo</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Ultima mov.</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = getStatus(item);

                  return (
                    <tr key={item.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-950">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.sku} - validade {formatDate(item.expiresAt)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p className="font-medium text-slate-900">{quantity(item.currentStock, item.unit)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Cobertura {item.coverageRatio === null ? "n/a" : `${item.coverageRatio}x`}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{quantity(item.minimumStock, item.unit)}</td>
                      <td className="px-4 py-4 text-slate-700">{money(item.currentStock * item.cost)}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {item.latestMovement ? movementLabels[item.latestMovement.type] ?? item.latestMovement.type : "Sem mov."}
                        {item.latestMovement && (
                          <span className="block text-xs text-slate-500">
                            {quantity(item.latestMovement.quantity, item.unit)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      Nenhum insumo encontrado para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Ajuste de inventario</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Informe o saldo contado para gravar a diferenca e atualizar o estoque.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <InventoryAdjustmentForm ingredients={ingredientOptions} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Prioridade de contagem</h3>
            <div className="mt-4 space-y-3">
              {overview.items.filter((item) => item.belowMinimum || item.expired || item.expiringSoon).length > 0 ? (
                overview.items
                  .filter((item) => item.belowMinimum || item.expired || item.expiringSoon)
                  .slice(0, 6)
                  .map((item) => (
                    <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <span className="font-medium">{item.name}</span>: {quantity(item.currentStock, item.unit)}
                      {item.belowMinimum && ` / minimo ${quantity(item.minimumStock, item.unit)}`}
                      {(item.expired || item.expiringSoon) && ` / validade ${formatDate(item.expiresAt)}`}
                    </div>
                  ))
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Nenhum item critico para recontagem imediata.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
