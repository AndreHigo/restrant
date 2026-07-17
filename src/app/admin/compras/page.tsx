import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPurchaseDashboard } from "@/lib/services/purchases";
import { Badge } from "@/components/ui/badge";
import { PurchaseOrderForm } from "@/components/admin/purchase-order-form";
import { PurchaseCancelForm } from "@/components/admin/purchase-cancel-form";
import { ContextualReportLinks } from "@/components/reports/contextual-report-links";

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
  const consumptionStart = new Date();
  consumptionStart.setDate(consumptionStart.getDate() - 30);

  const [dashboard, suppliers, ingredients, consumptionMovements] = await Promise.all([
    listPurchaseDashboard(),
    db.supplier.findMany({
      where: { active: true },
      orderBy: { corporateName: "asc" }
    }),
    db.ingredient.findMany({
      orderBy: { name: "asc" }
    }),
    db.stockMovement.findMany({
      select: {
        ingredientId: true,
        quantity: true,
        type: true
      },
      where: {
        createdAt: {
          gte: consumptionStart
        },
        type: {
          in: ["SALE", "LOSS", "OUT"]
        }
      }
    })
  ]);
  const consumptionByIngredient = consumptionMovements.reduce<Map<string, number>>((map, movement) => {
    const current = map.get(movement.ingredientId) ?? 0;
    map.set(movement.ingredientId, Number((current + Number(movement.quantity)).toFixed(3)));
    return map;
  }, new Map());

  const receivableOrders = dashboard.orders
    .filter((order) => order.canReceive)
    .map((order) => ({
      code: order.number,
      label: order.number,
      value: order.id,
      detail: `${order.itemName} (${order.pendingQty.toLocaleString("pt-BR")} ${order.itemUnit})`,
      pendingQty: order.pendingQty
    }));
  const purchaseSuggestions = ingredients
    .map((item) => {
      const currentStock = Number(item.currentStock);
      const minimumStock = Number(item.minimumStock);
      const thirtyDayConsumption = consumptionByIngredient.get(item.id) ?? 0;
      const averageDailyConsumption = Number((thirtyDayConsumption / 30).toFixed(3));
      const targetStock = Number(Math.max(minimumStock, averageDailyConsumption * 7).toFixed(3));
      const suggestedQuantity = Number(Math.max(targetStock - currentStock, 0).toFixed(3));
      const coverageDays =
        averageDailyConsumption > 0 ? Number((currentStock / averageDailyConsumption).toFixed(1)) : null;

      return {
        averageDailyConsumption,
        coverageDays,
        currentStock,
        ingredientId: item.id,
        ingredientName: item.name,
        minimumStock,
        sku: item.sku,
        suggestedQuantity,
        targetStock,
        thirtyDayConsumption,
        unit: item.unit,
        unitCost: Number(item.cost)
      };
    })
    .filter((item) => (item.minimumStock > 0 || item.averageDailyConsumption > 0) && item.suggestedQuantity > 0)
    .sort((a, b) => {
      const firstCoverage = a.coverageDays ?? Number.POSITIVE_INFINITY;
      const secondCoverage = b.coverageDays ?? Number.POSITIVE_INFINITY;
      if (firstCoverage !== secondCoverage) {
        return firstCoverage - secondCoverage;
      }

      return b.suggestedQuantity - a.suggestedQuantity;
    })
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <ContextualReportLinks
        title="Relatorios de compras"
        description="Acompanhe pedidos, recebimentos e impacto financeiro sem sair do modulo de compras."
        links={[
          {
            title: "Relatorio de compras",
            description: "Pedidos por status, fornecedores, valores e recebimentos do periodo.",
            href: "/admin/relatorios/compras",
            exportHref: "/api/admin/reports/purchases"
          },
          {
            title: "Contas geradas",
            description: "Veja contas a pagar originadas por compras recebidas.",
            href: "/admin/relatorios/financeiro",
            exportHref: "/api/admin/reports/financial"
          }
        ]}
      />

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

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Pedidos de compra</h3>
            <p className="mt-1 text-sm text-slate-500">
              Criacao, conferencia, recebimento e Cancelar compra pendente com auditoria.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Pedido</th>
                  <th className="px-6 py-3 font-medium">Fornecedor</th>
                  <th className="px-6 py-3 font-medium">Insumo</th>
                  <th className="px-6 py-3 font-medium">Quantidades</th>
                  <th className="px-6 py-3 font-medium">Conferencia</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Recebimento</th>
                  <th className="px-6 py-3 font-medium">Acoes</th>
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
                      <p>
                        {order.receivedQty.toLocaleString("pt-BR")} / {order.quantity.toLocaleString("pt-BR")}{" "}
                        {order.itemUnit}
                      </p>
                      {order.pendingQty > 0 && (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          Pendente: {order.pendingQty.toLocaleString("pt-BR")} {order.itemUnit}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === "CANCELED" ? (
                        <Badge tone="warning">Cancelado</Badge>
                      ) : order.pendingQty === 0 ? (
                        <Badge tone="success">Conferido</Badge>
                      ) : order.receivedQty > 0 ? (
                        <div className="space-y-1">
                          <Badge tone="warning">Divergencia parcial</Badge>
                          <p className="text-xs text-amber-700">
                            Falta {order.pendingQty.toLocaleString("pt-BR")} {order.itemUnit}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Badge>Aberto</Badge>
                          <p className="text-xs text-slate-500">Aguardando recebimento</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <Badge tone={order.status === "RECEIVED" ? "success" : "warning"}>{order.statusLabel}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(order.receivedAt)}</td>
                    <td className="px-6 py-4">
                      <PurchaseCancelForm canCancel={order.canCancel} orderId={order.id} />
                    </td>
                  </tr>
                ))}
                {dashboard.orders.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={9}>
                      Nenhum pedido de compra criado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-950">Compra rapida</h3>
          <p className="mt-1 text-sm text-slate-500">
            Lance um pedido por insumo e receba para alimentar o estoque.
          </p>
          <div className="mt-6">
            <PurchaseOrderForm
              ingredients={ingredients.map((item) => ({
                code: item.sku,
                label: item.name,
                meta: item.unit,
                value: item.id
              }))}
              receivableOrders={receivableOrders}
              suggestions={purchaseSuggestions}
              suppliers={suppliers.map((item) => ({
                code: item.document ?? undefined,
                label: item.tradeName || item.corporateName,
                keywords: [item.corporateName, item.tradeName, item.document, item.contactName].filter(Boolean).join(" "),
                meta: item.document ?? item.contactName ?? undefined,
                value: item.id
              }))}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
