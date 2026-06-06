import { requirePagePermission } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { listOperationDashboard } from "@/lib/services/operations";

export default async function OperationDashboardPage() {
  await requirePagePermission("sales.view");
  const dashboard = await listOperationDashboard();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Pedidos abertos", String(dashboard.kpis.openOrders)],
          ["Pedidos em cozinha", String(dashboard.kpis.kitchenOrders)],
          ["Caixas ativos", String(dashboard.kpis.openRegisters)]
        ].map(([title, value]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Fila operacional</h3>
          <p className="mt-1 text-sm text-slate-500">
            Fluxo operacional em tempo real para pedidos, cozinha e caixa.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {dashboard.orders.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Sem pedidos em aberto neste momento.
            </div>
          ) : (
            dashboard.orders.map((item) => (
              <div key={item.number} className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
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
