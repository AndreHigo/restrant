import { requirePagePermission } from "@/lib/auth";
import { InventoryAdjustmentForm } from "@/components/admin/inventory-adjustment-form";
import { Badge } from "@/components/ui/badge";
import { listStockOverview } from "@/lib/services/stock";

function formatDate(value: string) {
  if (!value) {
    return "Sem validade";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export default async function InventoryPage() {
  await requirePagePermission("stock.view");
  const overview = await listStockOverview();

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Inventario fisico</h3>
          <p className="mt-1 text-sm text-slate-500">
            Contagem e ajuste dos saldos reais dos insumos.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Insumo</th>
                <th className="px-6 py-3 font-medium">Saldo atual</th>
                <th className="px-6 py-3 font-medium">Minimo</th>
                <th className="px-6 py-3 font-medium">Validade</th>
                <th className="px-6 py-3 font-medium">Ultima mov.</th>
              </tr>
            </thead>
            <tbody>
              {overview.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {item.belowMinimum && <Badge tone="warning">Recontar</Badge>}
                      {item.expired && <Badge tone="warning">Vencido</Badge>}
                      {!item.expired && item.expiringSoon && <Badge tone="default">Validade</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{item.sku}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.currentStock.toLocaleString("pt-BR")} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.minimumStock.toLocaleString("pt-BR")} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatDate(item.expiresAt)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.latestMovement ? item.latestMovement.type : "Sem mov."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Ajuste de inventario</h3>
          <p className="mt-1 text-sm text-slate-500">
            Corrija o saldo para refletir a contagem fisica.
          </p>
        </div>
        <div className="mt-6">
          <InventoryAdjustmentForm
            ingredients={overview.items.map((item) => ({
              label: `${item.name} (${item.currentStock.toLocaleString("pt-BR")} ${item.unit})`,
              value: item.id
            }))}
          />
        </div>
      </section>
    </div>
  );
}
