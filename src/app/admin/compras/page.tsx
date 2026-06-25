import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPurchaseDashboard } from "@/lib/services/purchases";
import { Badge } from "@/components/ui/badge";
import { PurchaseOrderForm } from "@/components/admin/purchase-order-form";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export default async function AdminPurchasesPage() {
  await requirePagePermission("purchases.view");

  const [dashboard, suppliers, ingredients] = await Promise.all([
    listPurchaseDashboard(),
    db.supplier.findMany({
      where: { active: true },
      orderBy: { corporateName: "asc" }
    }),
    db.ingredient.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  const receivableOrders = dashboard.orders
    .filter((order) => order.canReceive)
    .map((order) => ({
      label: order.number,
      value: order.id,
      detail: `${order.itemName} (${order.pendingQty.toLocaleString("pt-BR")} ${order.itemUnit})`
    }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pedidos</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{dashboard.kpis.ordersCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Abertos</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{dashboard.kpis.openOrdersCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pendente</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(dashboard.kpis.pendingAmount)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Recebido</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-700">
            {formatCurrency(dashboard.kpis.receivedAmount)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Pedidos de compra</h3>
            <p className="mt-1 text-sm text-slate-500">
              Criacao, conferencia e recebimento com atualizacao automatica do estoque.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Pedido</th>
                  <th className="px-6 py-3 font-medium">Fornecedor</th>
                  <th className="px-6 py-3 font-medium">Insumo</th>
                  <th className="px-6 py-3 font-medium">Qtd.</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Recebimento</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{order.number}</p>
                      <p className="text-xs text-slate-500">previsao {formatDate(order.expectedAt)}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{order.supplierName}</td>
                    <td className="px-6 py-4 text-slate-600">{order.itemName}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {order.receivedQty.toLocaleString("pt-BR")} / {order.quantity.toLocaleString("pt-BR")}{" "}
                      {order.itemUnit}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <Badge tone={order.status === "RECEIVED" ? "success" : "warning"}>{order.statusLabel}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(order.receivedAt)}</td>
                  </tr>
                ))}
                {dashboard.orders.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={7}>
                      Nenhum pedido de compra criado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-950">Compra rapida</h3>
          <p className="mt-1 text-sm text-slate-500">
            Lance um pedido por insumo e receba para alimentar o estoque.
          </p>
          <div className="mt-6">
            <PurchaseOrderForm
              ingredients={ingredients.map((item) => ({
                label: `${item.name} (${item.unit})`,
                value: item.id
              }))}
              receivableOrders={receivableOrders}
              suppliers={suppliers.map((item) => ({
                label: item.tradeName || item.corporateName,
                value: item.id
              }))}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
