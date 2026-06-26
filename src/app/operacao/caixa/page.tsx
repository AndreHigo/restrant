import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { CashMovementForm } from "@/components/operations/cash-movement-form";
import { CashRegisterCloseForm } from "@/components/operations/cash-register-close-form";
import { CashRegisterOpenForm } from "@/components/operations/cash-register-open-form";
import { OrderCancelForm } from "@/components/operations/order-cancel-form";
import { PaymentForm } from "@/components/operations/payment-form";
import { QuickPaymentActions } from "@/components/operations/quick-payment-actions";
import { Badge } from "@/components/ui/badge";
import { getOpenCashRegisterSummary, listCashOrders, paymentMethodLabels } from "@/lib/services/operations";

type OperationCashPageProps = {
  searchParams?: {
    comanda?: string;
  };
};

export default async function OperationCashPage({ searchParams }: OperationCashPageProps) {
  await requirePagePermission("cash.manage");
  const tabFilter = searchParams?.comanda?.trim() ?? "";
  const [register, orders, methods] = await Promise.all([
    getOpenCashRegisterSummary(),
    listCashOrders(tabFilter),
    db.paymentMethod.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);
  const paymentMethods = methods.map((method) => ({
    label: method.name || paymentMethodLabels[method.type],
    value: method.type
  }));
  const filteredTotal = orders.reduce((sum, order) => sum + order.total, 0);
  const filteredPaid = orders.reduce((sum, order) => sum + order.paid, 0);
  const filteredRemaining = orders.reduce((sum, order) => sum + order.remaining, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Caixa do turno</h3>
          <p className="mt-1 text-sm text-slate-500">
            Abertura e acompanhamento inicial do caixa operacional.
          </p>
        </div>
        <div className="px-6 py-5">
          {register ? (
            <div className="space-y-5">
              {orders.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Existem {orders.length} pedido{orders.length > 1 ? "s" : ""} impedindo o fechamento do caixa.
                  Quite ou cancele as pendencias antes de encerrar o turno.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Caixa</p>
                  <p className="mt-1 font-semibold text-slate-900">{register.code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Abertura</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {register.openingAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Esperado</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {register.expectedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Status</p>
                  <div className="mt-1">
                    <Badge tone="success">Aberto</Badge>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-900">Suprimento e sangria</p>
                <CashMovementForm />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-900">Conferencia e fechamento</p>
                  <p className="text-sm text-slate-500">
                    Esperado:{" "}
                    <span className="font-medium text-slate-900">
                      {register.expectedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                </div>
                <CashRegisterCloseForm expectedAmount={register.expectedAmount} />
              </div>
              {register.movements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Ultimas movimentacoes
                  </p>
                  {register.movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-700">{movement.typeLabel}</span>
                      <span className="text-slate-500">{movement.reason}</span>
                      <span className={movement.type === "SUPPLY" ? "text-emerald-700" : "text-red-700"}>
                        {movement.type === "SUPPLY" ? "+" : "-"}
                        {movement.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <CashRegisterOpenForm />
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Fechamento inicial de pedidos</h3>
              <p className="mt-1 text-sm text-slate-500">
                Registro de pagamentos e acompanhamento do saldo restante.
              </p>
            </div>
            {tabFilter && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning">Comanda {tabFilter}</Badge>
                <Link className="text-sm font-medium text-brand-700" href="/operacao/caixa">
                  Limpar filtro
                </Link>
              </div>
            )}
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]" action="/operacao/caixa">
            <input
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              name="comanda"
              placeholder="Digite a comanda para cobrar. Ex.: 25"
              type="search"
              defaultValue={tabFilter}
            />
            <button className="h-12 rounded-lg bg-brand-600 px-5 text-[15px] font-medium text-white transition hover:bg-brand-700">
              Buscar comanda
            </button>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 px-5 text-[15px] font-medium text-slate-700 transition hover:bg-slate-50"
              href="/operacao/caixa"
            >
              Ver todos
            </Link>
          </form>
        </div>
        {tabFilter && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total da comanda</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {filteredTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pago</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {filteredPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Restante</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {filteredRemaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  href={`/operacao/comandas?numero=${encodeURIComponent(tabFilter)}`}
                >
                  Ver comanda
                </Link>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  href={`/operacao/pedidos?comanda=${encodeURIComponent(tabFilter)}`}
                >
                  Adicionar item
                </Link>
              </div>
            </div>
          </div>
        )}
        <div className="divide-y divide-slate-100">
          {orders.length === 0 ? (
            <div className="px-6 py-10">
              {tabFilter ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Comanda {tabFilter} sem pedido aguardando pagamento.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Verifique a comanda operacional ou lance um item antes de tentar cobrar.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={`/operacao/comandas?numero=${encodeURIComponent(tabFilter)}`}
                    >
                      Ver comanda
                    </Link>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
                      href={`/operacao/pedidos?comanda=${encodeURIComponent(tabFilter)}`}
                    >
                      Lancar item
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhum pedido aguardando pagamento.</p>
              )}
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-slate-900">{order.number}</p>
                      <Badge tone={order.remaining > 0 ? "warning" : "success"}>{order.statusLabel}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.channelLabel} - {order.label}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Total: {order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} | Pago:{" "}
                      {order.paid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} | Restante:{" "}
                      {order.remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div className="w-full max-w-xl">
                    {order.remaining > 0 ? (
                      <div className="space-y-3">
                        <QuickPaymentActions
                          salesOrderId={order.id}
                          remainingAmount={order.remaining}
                          methods={paymentMethods}
                        />
                        <PaymentForm
                          existingPayments={order.payments}
                          salesOrderId={order.id}
                          suggestedAmount={order.remaining}
                          methods={paymentMethods}
                        />
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            Cancelamento auditado
                          </p>
                          <OrderCancelForm salesOrderId={order.id} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        Pedido quitado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
