import { requirePagePermission } from "@/lib/auth";
import { StockMovementForm } from "@/components/admin/stock-movement-form";
import { Badge } from "@/components/ui/badge";
import { listStockOverview } from "@/lib/services/stock";

function formatDate(value: string) {
  if (!value) {
    return "Sem validade";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export default async function AdminStockPage() {
  await requirePagePermission("stock.view");
  const overview = await listStockOverview();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Insumos monitorados</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.kpis.ingredientsCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Alertas de minimo</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{overview.kpis.lowStockCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Valor estimado</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {overview.kpis.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Vencendo em 7 dias</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.kpis.expiringCount}</p>
          {overview.kpis.expiredCount > 0 && (
            <p className="mt-2 text-sm font-medium text-red-700">{overview.kpis.expiredCount} vencido(s)</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Saldos e alertas</h3>
            <p className="mt-1 text-sm text-slate-500">
              Visao operacional dos insumos, custo medio e ultima movimentacao.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Insumo</th>
                  <th className="px-6 py-3 font-medium">Saldo</th>
                  <th className="px-6 py-3 font-medium">Minimo</th>
                  <th className="px-6 py-3 font-medium">Custo</th>
                  <th className="px-6 py-3 font-medium">Ultima mov.</th>
                </tr>
              </thead>
              <tbody>
                {overview.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        {item.belowMinimum && <Badge tone="warning">Minimo</Badge>}
                        {item.expired && <Badge tone="warning">Vencido</Badge>}
                        {!item.expired && item.expiringSoon && <Badge tone="default">Validade</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">
                        {item.sku} - cobertura {item.coverageRatio === null ? "n/a" : `${item.coverageRatio}x`}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.currentStock.toLocaleString("pt-BR")} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.minimumStock.toLocaleString("pt-BR")} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.latestMovement ? item.latestMovement.type : "Sem mov."}
                      <span className="block text-xs text-slate-400">{formatDate(item.expiresAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Movimentar estoque</h3>
              <p className="mt-1 text-sm text-slate-500">
                Entrada, saida, perda, compra e ajuste manual.
              </p>
            </div>
            <div className="mt-6">
              <StockMovementForm
                ingredients={overview.items.map((item) => ({
                  label: `${item.name} (${item.currentStock.toLocaleString("pt-BR")} ${item.unit})`,
                  value: item.id
                }))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Estoque minimo</h3>
            <div className="mt-4 space-y-3">
              {overview.lowStockItems.length > 0 ? (
                overview.lowStockItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {item.name}: {item.currentStock.toLocaleString("pt-BR")} {item.unit} / minimo de{" "}
                    {item.minimumStock.toLocaleString("pt-BR")} {item.unit}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Nenhum item abaixo do estoque minimo.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Validade critica</h3>
            <div className="mt-4 space-y-3">
              {overview.expiringItems.length > 0 ? (
                overview.expiringItems.map((item) => (
                  <div
                    key={item.id}
                    className={
                      item.expired
                        ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                        : "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                    }
                  >
                    <span className="font-medium">{item.name}</span>: {item.currentStock.toLocaleString("pt-BR")}{" "}
                    {item.unit} - {item.expired ? "venceu em" : "vence em"} {formatDate(item.expiresAt)}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Nenhum item vencido ou vencendo em 7 dias.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
