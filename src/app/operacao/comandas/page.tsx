import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { OrderItemCancelForm } from "@/components/operations/order-item-cancel-form";
import { OrderItemEditForm } from "@/components/operations/order-item-edit-form";
import { OrderItemTransferForm } from "@/components/operations/order-item-transfer-form";
import { OrderItemWeightAdjustForm } from "@/components/operations/order-item-weight-adjust-form";
import { TabMergeForm } from "@/components/operations/tab-merge-form";
import { listOperationalTabs } from "@/lib/services/operations";

type OperationTabsPageProps = {
  searchParams?: {
    numero?: string;
  };
};

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

export default async function OperationTabsPage({ searchParams }: OperationTabsPageProps) {
  await requirePagePermission("sales.view");
  const query = searchParams?.numero?.trim() ?? "";
  const tabs = await listOperationalTabs(query);
  const totalBalance = tabs.reduce((sum, tab) => sum + tab.remaining, 0);
  const totalOrders = tabs.reduce((sum, tab) => sum + tab.ordersCount, 0);
  const encodedQuery = encodeURIComponent(query);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" action="/operacao/comandas">
          <input
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            name="numero"
            placeholder="Digite a comanda. Ex.: 25"
            type="search"
            defaultValue={query}
          />
          <button className="h-11 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700">
            Buscar comanda
          </button>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href="/operacao/comandas"
          >
            Ver abertas
          </Link>
        </form>
      </section>

      <TabMergeForm initialSourceCode={query} />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Comandas encontradas", String(tabs.length)],
          ["Pedidos em comandas", String(totalOrders)],
          ["Saldo pendente", totalBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })]
        ].map(([title, value]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Comandas em uso</h3>
          <p className="mt-1 text-sm text-slate-500">
            Consulta operacional dos itens lancados pela balanca e atendimento.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {tabs.length === 0 ? (
            <div className="px-6 py-10">
              {query ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Comanda {query} sem pedido aberto.</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Lance um item para abrir a comanda automaticamente no atendimento.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
                      href={`/operacao/pedidos?comanda=${encodedQuery}`}
                    >
                      Lancar produto
                    </Link>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={`/operacao/balanca?comanda=${encodedQuery}`}
                    >
                      Lancar peso
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhuma comanda encontrada.</p>
              )}
            </div>
          ) : (
            tabs.map((tab) => (
              <div key={tab.id} className="space-y-4 px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-slate-950">Comanda {tab.number}</p>
                      <Badge tone={tab.remaining > 0 ? "warning" : "success"}>
                        {tab.ordersCount} pedido{tab.ordersCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    {tab.customerName && tab.customerName !== `Comanda ${tab.number}` && (
                      <p className="mt-1 text-sm text-slate-500">{tab.customerName}</p>
                    )}
                  </div>
                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3 lg:text-right">
                    <p>Total: {tab.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <p>Pago: {tab.paid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <p className="font-medium text-slate-950">
                      Pendente: {tab.remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:col-span-3"
                      href={`/operacao/pedidos?comanda=${encodeURIComponent(tab.number)}`}
                    >
                      Adicionar item
                    </Link>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:col-span-3"
                      href={`/operacao/balanca?comanda=${encodeURIComponent(tab.number)}`}
                    >
                      Lancar peso
                    </Link>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700 sm:col-span-3"
                      href={`/operacao/caixa?comanda=${encodeURIComponent(tab.number)}`}
                    >
                      Ir para pagamento
                    </Link>
                  </div>
                </div>

                {tab.orders.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Comanda sem pedido em aberto.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tab.orders.map((order) => (
                      <div key={order.id} className="rounded-lg border border-slate-200">
                        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-slate-900">{order.number}</p>
                            <Badge tone={order.remaining > 0 ? "warning" : "success"}>{order.statusLabel}</Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-700">
                            {order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {order.items.map((item) => (
                            <div key={item.id} className="px-4 py-3 text-sm">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-medium text-slate-800">{item.productName}</p>
                                  <p className="text-slate-500">
                                    {item.weightKg > 0
                                      ? `${item.weightKg.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 3,
                                          maximumFractionDigits: 3
                                        })} kg`
                                      : `${item.quantity.toLocaleString("pt-BR")} un`}
                                    {item.notes ? ` - ${item.notes}` : ""}
                                  </p>
                                </div>
                                <p className="font-medium text-slate-900">
                                  {item.totalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                              </div>
                              <OrderItemEditForm
                                currentNotes={item.notes}
                                currentQuantity={item.quantity}
                                isWeighable={item.isWeighable}
                                salesOrderItemId={item.id}
                              />
                              {item.isWeighable && (
                                <OrderItemWeightAdjustForm currentWeightKg={item.weightKg} salesOrderItemId={item.id} />
                              )}
                              <OrderItemTransferForm currentTabCode={tab.number} salesOrderItemId={item.id} />
                              <OrderItemCancelForm salesOrderItemId={item.id} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <details className="rounded-lg border border-slate-200 bg-slate-50">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900">
                    <span>Historico da comanda</span>
                    <Badge>{tab.history.length} evento{tab.history.length === 1 ? "" : "s"}</Badge>
                  </summary>
                  <div className="border-t border-slate-200 bg-white px-4 py-4">
                    {tab.history.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhum evento auditado encontrado para esta comanda.</p>
                    ) : (
                      <div className="space-y-3">
                        {tab.history.map((event) => (
                          <div key={event.id} className="grid gap-3 rounded-lg border border-slate-100 bg-white px-3 py-3 text-sm md:grid-cols-[110px_1fr_auto] md:items-start">
                            <p className="font-medium text-slate-500">{formatHistoryTime(event.createdAt)}</p>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-950">{event.title}</p>
                                <Badge tone={event.tone}>{event.tone === "warning" ? "Atencao" : event.tone === "success" ? "Ok" : "Info"}</Badge>
                              </div>
                              <p className="mt-1 leading-6 text-slate-600">{event.description}</p>
                            </div>
                            <p className="text-slate-500 md:text-right">{event.actor}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
