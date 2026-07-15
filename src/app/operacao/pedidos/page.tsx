import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderCreateForm } from "@/components/operations/order-create-form";
import { listOperationDashboard } from "@/lib/services/operations";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { Badge } from "@/components/ui/badge";
import { OrderCancelForm } from "@/components/operations/order-cancel-form";
import { QuickPosCodeForm } from "@/components/operations/quick-pos-code-form";

type OperationOrdersPageProps = {
  searchParams?: {
    comanda?: string;
    origem?: string;
  };
};

export default async function OperationOrdersPage({ searchParams }: OperationOrdersPageProps) {
  const session = await requirePagePermission("sales.view");
  const canManageSales = session.permissions.includes("sales.manage");
  const canCancelOrders = canManageSales || session.permissions.includes("cash.manage");
  const initialTabCode = searchParams?.comanda?.trim() ?? "";
  const waiterMode = searchParams?.origem === "garcom" && initialTabCode.length > 0;
  const [dashboard, customers, tables, tabs, products, scaleDevices, operationSettings] = await Promise.all([
    listOperationDashboard(),
    db.customer.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 200 }),
    db.restaurantTable.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    db.tab.findMany({ where: { active: true }, orderBy: { openedAt: "desc" }, take: 200 }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.scaleDevice.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getOperationSettings()
  ]);

  const orderForm = (
    <OrderCreateForm
      customers={customers.map((item) => ({
        code: item.document ?? undefined,
        keywords: [item.name, item.document, item.phone, item.email].filter(Boolean).join(" "),
        label: item.name,
        meta: item.phone ?? item.email ?? undefined,
        value: item.id
      }))}
      products={products.map((item) => ({
        code: item.sku,
        id: item.id,
        label: `${item.name} - ${Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
        name: item.name,
        price: Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price),
        searchLabel: `${item.sku} ${item.name} ${item.categoryId} ${Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
        typeLabel: item.type === "WEIGHABLE" ? "Venda por quilo" : "Item unitario",
        isWeighable: item.type === "WEIGHABLE"
      }))}
      scaleDevices={scaleDevices.map((item) => ({
        label: item.name,
        value: item.id
      }))}
      tables={tables.map((item) => ({ code: item.code, label: item.name, value: item.id }))}
      tabs={tabs.map((item) => ({ label: item.number, value: item.id, code: item.number }))}
      initialTabCode={initialTabCode}
      mode={waiterMode ? "waiter" : "default"}
      operationSettings={{
        allowManualWeightInput: operationSettings.allowManualWeightInput,
        enableCounter: operationSettings.enableCounter,
        enableDelivery: operationSettings.enableDelivery,
        enableTableService: operationSettings.enableTableService,
        enableTakeout: operationSettings.enableTakeout
      }}
    />
  );

  const enabledChannels = [
    "comanda",
    operationSettings.enableTableService ? "mesa" : null,
    operationSettings.enableCounter ? "balcao/PDV" : null,
    operationSettings.enableTakeout ? "retirada" : null,
    operationSettings.enableDelivery ? "delivery" : null
  ].filter(Boolean);

  if (waiterMode) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Garcom</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-slate-950">Adicionar item</h3>
              <p className="mt-1 text-sm text-slate-500">Comanda {initialTabCode}</p>
            </div>
            <Badge tone="warning">Comanda {initialTabCode}</Badge>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          {orderForm}
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_520px]">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Pedidos em andamento</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Canais habilitados: {enabledChannels.join(", ")}.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {dashboard.orders.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhum pedido aberto no momento. Abra um novo pedido no painel ao lado.
            </div>
          ) : (
            dashboard.orders.map((order) => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-slate-900">{order.number}</p>
                      <Badge tone={order.status === "OPEN" ? "warning" : "success"}>{order.statusLabel}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.channelLabel} - {order.customerLabel} - {order.itemsCount} itens
                    </p>
                    {order.notes && <p className="mt-2 text-sm text-slate-600">{order.notes}</p>}
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
                {canCancelOrders && (
                  <div className="mt-3 flex justify-end">
                    <OrderCancelForm salesOrderId={order.id} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">PDV rapido</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Lancamento por codigo</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Digite a comanda e o codigo numerico do produto para lancar sem navegar pelo formulario completo.
            </p>
          </div>
          <div className="mt-4">
            <QuickPosCodeForm
              initialTabCode={initialTabCode}
              products={products.map((item) => ({
                code: item.sku,
                id: item.id,
                isWeighable: item.type === "WEIGHABLE",
                name: item.name,
                price: Number(item.type === "WEIGHABLE" ? item.pricePerKg ?? 0 : item.price)
              }))}
            />
          </div>
        </div>

        <div>
          <h3 className="mt-6 text-lg font-semibold text-slate-950">Novo pedido ou reforco</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Para mesa, comanda e balcao, novos itens entram no pedido aberto mais recente.
          </p>
        </div>
        <div className="mt-6">
          {orderForm}
        </div>
      </section>
    </div>
  );
}
