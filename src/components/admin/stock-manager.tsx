"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, CalendarClock, ClipboardList, History, Search, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StockMovementForm } from "@/components/admin/stock-movement-form";

type StockItem = {
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

type StockMovement = {
  id: string;
  ingredientName: string;
  ingredientUnit: string;
  type: string;
  quantity: number;
  unitCost: number;
  reason: string;
  referenceType: string;
  createdAt: string;
};

type StockOverview = {
  kpis: {
    ingredientsCount: number;
    lowStockCount: number;
    totalValue: number;
    expiringCount: number;
    expiredCount: number;
  };
  items: StockItem[];
  lowStockItems: Array<Pick<StockItem, "id" | "name" | "currentStock" | "minimumStock" | "unit">>;
  expiringItems: Array<Pick<StockItem, "id" | "name" | "currentStock" | "unit" | "expiresAt" | "expired">>;
  recentMovements: StockMovement[];
};

type StockFilter = "all" | "low" | "validity" | "healthy";

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

function getStatus(item: StockItem) {
  if (item.expired) {
    return { label: "Vencido", tone: "warning" as const, className: "text-red-700" };
  }

  if (item.belowMinimum) {
    return { label: "Minimo", tone: "warning" as const, className: "text-amber-700" };
  }

  if (item.expiringSoon) {
    return { label: "Validade", tone: "default" as const, className: "text-slate-700" };
  }

  return { label: "Normal", tone: "success" as const, className: "text-emerald-700" };
}

export function StockManager({ canAdjustStock, overview }: { canAdjustStock: boolean; overview: StockOverview }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return overview.items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.sku, item.unit].some((value) => value.toLowerCase().includes(normalizedQuery));

      if (!matchesQuery) {
        return false;
      }

      if (filter === "low") {
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

  const ingredientOptions = overview.items.map((item) => ({
    code: item.sku,
    label: item.name,
    meta: `${quantity(item.currentStock, item.unit)} em estoque`,
    value: item.id
  }));

  const filterOptions: Array<{ label: string; value: StockFilter; count: number }> = [
    { label: "Todos", value: "all", count: overview.items.length },
    { label: "Minimo", value: "low", count: overview.kpis.lowStockCount },
    { label: "Validade", value: "validity", count: overview.kpis.expiringCount + overview.kpis.expiredCount },
    {
      label: "Normal",
      value: "healthy",
      count: overview.items.filter((item) => !item.belowMinimum && !item.expired && !item.expiringSoon).length
    }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Insumos monitorados</p>
            <Boxes className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.kpis.ingredientsCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Alertas de minimo</p>
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{overview.kpis.lowStockCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Valor estimado</p>
            <WalletCards className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{money(overview.kpis.totalValue)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Validade critica</p>
            <CalendarClock className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {overview.kpis.expiringCount + overview.kpis.expiredCount}
          </p>
          {overview.kpis.expiredCount > 0 && (
            <p className="mt-2 text-sm font-medium text-red-700">{overview.kpis.expiredCount} vencido(s)</p>
          )}
        </div>
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-950">Saldos e movimentacoes</h3>
                  <Badge tone="success">Estoque operacional</Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Visao para acompanhar saldo, validade, cobertura e ultima movimentacao dos insumos.
                </p>
              </div>
              <label className="relative w-full xl:w-96">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por insumo, codigo ou unidade"
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
                  <th className="px-4 py-3 font-semibold">Saldo</th>
                  <th className="px-4 py-3 font-semibold">Minimo</th>
                  <th className="px-4 py-3 font-semibold">Custo</th>
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
                        <p className={`font-medium ${status.className}`}>{quantity(item.currentStock, item.unit)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Cobertura {item.coverageRatio === null ? "n/a" : `${item.coverageRatio}x`}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{quantity(item.minimumStock, item.unit)}</td>
                      <td className="px-4 py-4 text-slate-700">{money(item.cost)}</td>
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
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Movimentar estoque</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Entrada, saida, compra, perda e ajuste manual.</p>
              </div>
            </div>
            {canAdjustStock ? (
              <div className="mt-6">
                <StockMovementForm ingredients={ingredientOptions} />
              </div>
            ) : (
              <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Seu perfil pode consultar o estoque, mas nao registrar movimentacoes manuais.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-950">Historico recente</h3>
            </div>
            <div className="mt-4 space-y-3">
              {overview.recentMovements.length > 0 ? (
                overview.recentMovements.map((movement) => (
                  <div key={movement.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{movement.ingredientName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {movementLabels[movement.type] ?? movement.type} -{" "}
                          {quantity(movement.quantity, movement.ingredientUnit)}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">{formatDateTime(movement.createdAt)}</span>
                    </div>
                    {movement.reason && <p className="mt-2 text-xs text-slate-500">{movement.reason}</p>}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Nenhuma movimentacao registrada ainda.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Alertas</h3>
            <div className="mt-4 space-y-3">
              {[...overview.lowStockItems.slice(0, 3), ...overview.expiringItems.slice(0, 3)].length > 0 ? (
                <>
                  {overview.lowStockItems.slice(0, 3).map((item) => (
                    <div key={`low-${item.id}`} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {item.name}: {quantity(item.currentStock, item.unit)} / minimo {quantity(item.minimumStock, item.unit)}
                    </div>
                  ))}
                  {overview.expiringItems.slice(0, 3).map((item) => (
                    <div
                      key={`exp-${item.id}`}
                      className={
                        item.expired
                          ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                          : "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                      }
                    >
                      {item.name}: {item.expired ? "venceu em" : "vence em"} {formatDate(item.expiresAt)}
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Nenhum alerta critico no momento.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
