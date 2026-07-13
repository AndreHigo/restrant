import { redirect } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { KitchenStatusForm } from "@/components/operations/kitchen-status-form";
import { Badge } from "@/components/ui/badge";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { listKitchenOrders } from "@/lib/services/operations";

const kitchenColumns = [
  { status: "OPEN", title: "Novos", empty: "Nenhum pedido novo." },
  { status: "PREPARING", title: "Em preparo", empty: "Nada em preparo." },
  { status: "READY", title: "Prontos", empty: "Nenhum pedido pronto." }
] as const;

function formatKitchenTime(minutesOpen: number) {
  if (minutesOpen < 1) {
    return "Agora";
  }

  if (minutesOpen < 60) {
    return `${minutesOpen} min`;
  }

  const hours = Math.floor(minutesOpen / 60);
  const minutes = minutesOpen % 60;

  return `${hours}h${minutes.toString().padStart(2, "0")}`;
}

export default async function OperationKitchenPage() {
  await requirePagePermission("sales.view");
  const operationSettings = await getOperationSettings();

  if (!operationSettings.enableKitchen) {
    redirect("/operacao");
  }

  const orders = await listKitchenOrders();
  const totals = kitchenColumns.map((column) => ({
    ...column,
    count: orders.filter((order) => order.status === column.status).length
  }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {totals.map((item) => (
          <div key={item.status} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{item.title}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{item.count}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {kitchenColumns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);

          return (
            <div key={column.status} className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">{column.title}</h3>
                  <Badge tone={column.status === "OPEN" ? "warning" : "success"}>{columnOrders.length}</Badge>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {columnOrders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    {column.empty}
                  </div>
                ) : (
                  columnOrders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{order.number}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {order.channelLabel} - {order.label}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge tone={order.status === "OPEN" ? "warning" : "success"}>{order.statusLabel}</Badge>
                          <p className="mt-2 text-xs font-medium text-slate-500">
                            {formatKitchenTime(order.minutesOpen)}
                          </p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          {order.notes}
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <span className="font-medium text-slate-900">
                              {item.weightKg > 0
                                ? `${item.weightKg.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 3,
                                    maximumFractionDigits: 3
                                  })} kg`
                                : `${item.quantity.toLocaleString("pt-BR")}x`}{" "}
                              {item.name}
                            </span>
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
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
