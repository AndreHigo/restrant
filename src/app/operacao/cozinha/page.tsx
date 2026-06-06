import { requirePagePermission } from "@/lib/auth";
import { KitchenStatusForm } from "@/components/operations/kitchen-status-form";
import { Badge } from "@/components/ui/badge";
import { listKitchenOrders } from "@/lib/services/operations";

export default async function OperationKitchenPage() {
  await requirePagePermission("sales.view");
  const orders = await listKitchenOrders();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-3">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 xl:col-span-3">
            Nenhum pedido aguardando a cozinha neste momento.
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{order.number}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {order.channelLabel} - {order.label}
                  </p>
                </div>
                <Badge tone={order.status === "OPEN" ? "warning" : "success"}>{order.statusLabel}</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {item.quantity.toLocaleString("pt-BR")}x {item.name}
                    {item.notes && <span className="block text-xs text-slate-500">{item.notes}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {order.status === "OPEN" && (
                  <KitchenStatusForm label="Iniciar preparo" nextStatus="PREPARING" salesOrderId={order.id} />
                )}
                {order.status === "PREPARING" && (
                  <KitchenStatusForm label="Marcar pronto" nextStatus="READY" salesOrderId={order.id} />
                )}
                {order.status === "READY" && (
                  <KitchenStatusForm label="Liberar entrega" nextStatus="DELIVERED" salesOrderId={order.id} />
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
