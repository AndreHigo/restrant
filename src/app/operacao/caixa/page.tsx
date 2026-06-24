import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { CashRegisterOpenForm } from "@/components/operations/cash-register-open-form";
import { PaymentForm } from "@/components/operations/payment-form";
import { Badge } from "@/components/ui/badge";
import { getOpenCashRegisterSummary, listCashOrders, paymentMethodLabels } from "@/lib/services/operations";

export default async function OperationCashPage() {
  await requirePagePermission("cash.manage");
  const [register, orders, methods] = await Promise.all([
    getOpenCashRegisterSummary(),
    listCashOrders(),
    db.paymentMethod.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

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
          ) : (
            <CashRegisterOpenForm />
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Fechamento inicial de pedidos</h3>
          <p className="mt-1 text-sm text-slate-500">
            Registro de pagamentos e acompanhamento do saldo restante.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {orders.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhum pedido aguardando pagamento.
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
                      <PaymentForm
                        existingPayments={order.payments}
                        salesOrderId={order.id}
                        suggestedAmount={order.remaining}
                        methods={methods.map((method) => ({
                          label: method.name || paymentMethodLabels[method.type],
                          value: method.type
                        }))}
                      />
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
