import { redirect } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { listProductionBoard } from "@/lib/services/operations";
import { Badge } from "@/components/ui/badge";
import { ProductionStatusForm } from "@/components/operations/production-status-form";

const statusTone = {
  PENDING: "warning",
  PREPARING: "default",
  READY: "success"
} as const;

function quantity(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default async function ProductionPage() {
  await requirePagePermission("sales.view");
  const operationSettings = await getOperationSettings();

  if (!operationSettings.enableKitchen) {
    redirect("/operacao");
  }

  const sectors = await listProductionBoard();
  const totalPending = sectors.reduce((sum, sector) => sum + sector.pendingCount, 0);
  const totalPreparing = sectors.reduce((sum, sector) => sum + sector.preparingCount, 0);
  const totalReady = sectors.reduce((sum, sector) => sum + sector.readyCount, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Pendentes", totalPending],
          ["Em preparo", totalPreparing],
          ["Prontos", totalReady]
        ].map(([title, value]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {sectors.map((sector) => (
          <div key={sector.id} className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">{sector.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {sector.pendingCount} pendente(s), {sector.preparingCount} em preparo, {sector.readyCount} pronto(s)
                </p>
              </div>
              <Badge tone={sector.pendingCount > 0 ? "warning" : "success"}>{sector.items.length}</Badge>
            </div>
            <div className="space-y-3 p-4">
              {sector.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Nada para produzir neste setor.
                </div>
              ) : (
                sector.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{item.productName}</p>
                          <Badge tone={statusTone[item.status as keyof typeof statusTone]}>{item.statusLabel}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {quantity(item.quantity)} un - {item.channelLabel} - {item.destination}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">Pedido {item.orderNumber}</p>
                      </div>
                    </div>
                    {(item.itemNotes || item.notes) && (
                      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {item.itemNotes || item.notes}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.status === "PENDING" && (
                        <ProductionStatusForm
                          label="Iniciar preparo"
                          productionItemId={item.id}
                          status="PREPARING"
                        />
                      )}
                      {item.status === "PREPARING" && (
                        <ProductionStatusForm
                          label="Marcar pronto"
                          productionItemId={item.id}
                          status="READY"
                          variant="primary"
                        />
                      )}
                      {item.status === "READY" && (
                        <ProductionStatusForm
                          label="Entregar"
                          productionItemId={item.id}
                          status="DELIVERED"
                          variant="primary"
                        />
                      )}
                      <ProductionStatusForm
                        label="Cancelar producao"
                        productionItemId={item.id}
                        status="CANCELED"
                        variant="ghost"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
