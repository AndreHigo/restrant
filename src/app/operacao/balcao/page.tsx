import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuickPosCodeForm } from "@/components/operations/quick-pos-code-form";
import { Badge } from "@/components/ui/badge";
import { getOperationSettings } from "@/lib/services/operation-settings";

export default async function CounterServicePage() {
  await requirePagePermission("sales.view");
  const [operationSettings, products, sectors] = await Promise.all([
    getOperationSettings(),
    db.product.findMany({
      where: {
        active: true,
        type: {
          not: "INGREDIENT"
        }
      },
      include: {
        productionSector: true
      },
      orderBy: [{ sendToProduction: "desc" }, { name: "asc" }]
    }),
    db.productionSector.findMany({
      where: {
        active: true
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);
  const quickProducts = products.filter((item) => item.type !== "WEIGHABLE").slice(0, 12);
  const productionProducts = products.filter((item) => item.sendToProduction && item.productionSectorId);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Atendimento rapido de balcao</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Lance marmita, PF, bebidas e itens de retirada por codigo. Produtos configurados para producao entram automaticamente no setor correto.
              </p>
            </div>
            <Badge tone={operationSettings.enableCounter ? "success" : "warning"}>
              {operationSettings.enableCounter ? "Balcao ativo" : "Balcao inativo"}
            </Badge>
          </div>
        </div>
        <div className="p-6">
          {operationSettings.enableCounter ? (
            <QuickPosCodeForm
              defaultChannel="COUNTER"
              requireTab={false}
              products={products.map((item) => ({
                code: item.sku,
                id: item.id,
                isWeighable: item.type === "WEIGHABLE",
                name: item.name,
                price: Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price)
              }))}
            />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              O canal de balcao esta desativado nas configuracoes operacionais.
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-950">Codigos rapidos</h3>
            <p className="mt-1 text-sm text-slate-500">Itens mais provaveis no balcao.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {quickProducts.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{item.sku} - {item.name}</p>
                  <p className="mt-1 text-slate-500">
                    {item.productionSector?.name ?? "Sem setor"}{item.sendToProduction ? " | envia para producao" : ""}
                  </p>
                </div>
                <p className="font-semibold text-slate-950">
                  {Number(item.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-950">Setores que recebem pedidos</h3>
            <p className="mt-1 text-sm text-slate-500">{productionProducts.length} produto{productionProducts.length === 1 ? "" : "s"} configurado{productionProducts.length === 1 ? "" : "s"}.</p>
          </div>
          <div className="space-y-3 p-5">
            {sectors.map((sector) => {
              const count = productionProducts.filter((item) => item.productionSectorId === sector.id).length;

              return (
                <div key={sector.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{sector.name}</span>
                  <Badge>{count}</Badge>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}
