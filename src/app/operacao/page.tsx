import Link from "next/link";
import type { Route } from "next";
import { requirePagePermission } from "@/lib/auth";
import { TabQuickAccessForm } from "@/components/operations/tab-quick-access-form";
import { Badge } from "@/components/ui/badge";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { listOperationDashboard } from "@/lib/services/operations";

export default async function OperationDashboardPage() {
  const session = await requirePagePermission("sales.view");
  const [dashboard, operationSettings] = await Promise.all([
    listOperationDashboard(),
    getOperationSettings()
  ]);
  const canManageCash = session.permissions.includes("cash.manage");

  const operationalActions = [
    { label: "Lancar produto", href: "/operacao/pedidos" as Route, enabled: true },
    { label: "Balcao rapido", href: "/operacao/balcao" as Route, enabled: operationSettings.enableCounter },
    { label: "Lancar peso", href: "/operacao/balanca" as Route, enabled: operationSettings.enableBuffetKg },
    { label: "Consultar comanda", href: "/operacao/comandas" as Route, enabled: true }
  ].filter((action) => action.enabled);

  const kpis = [
    ["Pedidos abertos", String(dashboard.kpis.openOrders)],
    ["Comandas abertas", String(dashboard.kpis.openTabs)],
    [
      "Saldo em comandas",
      dashboard.kpis.openTabsBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    ],
    operationSettings.enableKitchen ? ["Pedidos em cozinha", String(dashboard.kpis.kitchenOrders)] : null,
    ["Caixas ativos", String(dashboard.kpis.openRegisters)]
  ].filter((item): item is [string, string] => Boolean(item));

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3">
        {operationalActions.map((action, index) => (
          <Link
            key={action.href}
            className={
              index === 0
                ? "inline-flex h-12 items-center justify-center rounded-lg bg-brand-600 px-4 text-[15px] font-medium text-white transition hover:bg-brand-700"
                : "inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-700 transition hover:bg-slate-50"
            }
            href={action.href}
          >
            {action.label}
          </Link>
        ))}
      </section>

      <TabQuickAccessForm
        showCash={canManageCash}
        showScale={operationSettings.enableBuffetKg}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map(([title, value]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <h3 className="text-lg font-semibold text-slate-950">Comandas abertas</h3>
          <p className="mt-1 text-sm text-slate-500">Comandas ativas e saldo pendente.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {dashboard.tabs.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              Nenhuma comanda aberta neste momento.
            </div>
          ) : (
            dashboard.tabs.map((tab) => (
              <div key={tab.id} className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-slate-900">Comanda {tab.number}</p>
                    <Badge tone={tab.remaining > 0 ? "warning" : "success"}>
                      {tab.ordersCount} pedido{tab.ordersCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {tab.customerName && tab.customerName !== `Comanda ${tab.number}` && (
                    <p className="mt-1 text-sm text-slate-500">{tab.customerName}</p>
                  )}
                </div>
                <div className="space-y-2 text-sm text-slate-700 lg:text-right">
                  <div>
                    <p>
                      Total:{" "}
                      <span className="font-medium text-slate-950">
                        {tab.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </p>
                    <p className="mt-1">
                      Pendente:{" "}
                      <span className="font-medium text-slate-950">
                        {tab.remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={`/operacao/pedidos?comanda=${encodeURIComponent(tab.number)}`}
                    >
                      Item
                    </Link>
                    {operationSettings.enableBuffetKg ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        href={`/operacao/balanca?comanda=${encodeURIComponent(tab.number)}`}
                      >
                        Peso
                      </Link>
                    ) : null}
                    {canManageCash ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition hover:bg-brand-700"
                        href={`/operacao/caixa?comanda=${encodeURIComponent(tab.number)}`}
                      >
                        Cobrar
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <h3 className="text-lg font-semibold text-slate-950">Fila operacional</h3>
          <p className="mt-1 text-sm text-slate-500">Pedidos{operationSettings.enableKitchen ? ", cozinha" : ""} e caixa.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {dashboard.orders.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              Sem pedidos em aberto neste momento.
            </div>
          ) : (
            dashboard.orders.map((item) => (
              <div key={item.number} className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-slate-900">{item.number}</p>
                    <Badge tone={item.status === "OPEN" ? "warning" : "success"}>{item.statusLabel}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.channelLabel} - {item.customerLabel}
                  </p>
                </div>
                <div className="text-sm font-medium text-slate-700">
                  {item.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
