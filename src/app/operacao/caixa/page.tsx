import type { SalesChannel } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { CashMovementForm } from "@/components/operations/cash-movement-form";
import { CashRegisterCloseForm } from "@/components/operations/cash-register-close-form";
import { CashRegisterOpenForm } from "@/components/operations/cash-register-open-form";
import { CancellationReviewForm } from "@/components/operations/cancellation-review-form";
import { OrderAdjustmentForm } from "@/components/operations/order-adjustment-form";
import { OrderCancelForm } from "@/components/operations/order-cancel-form";
import { PaymentForm } from "@/components/operations/payment-form";
import { QuickPaymentActions } from "@/components/operations/quick-payment-actions";
import { ContextualReportLinks } from "@/components/reports/contextual-report-links";
import { Badge } from "@/components/ui/badge";
import { getOperationSettings } from "@/lib/services/operation-settings";
import {
  type CashOrderStatusFilter,
  getOpenCashRegisterSummary,
  listCashOrders,
  listPendingCancellationRequests,
  paymentMethodLabels,
  salesChannelLabels
} from "@/lib/services/operations";

type OperationCashPageProps = {
  searchParams?: {
    busca?: string;
    canal?: string;
    comanda?: string;
    status?: string;
  };
};

const statusOptions: Array<{ label: string; value: CashOrderStatusFilter }> = [
  { label: "Pendentes", value: "pending" },
  { label: "Pagos recentes", value: "paid" },
  { label: "Todos", value: "all" }
];

const channelOptions: Array<{ label: string; value: SalesChannel | "all" }> = [
  { label: "Todos os canais", value: "all" },
  { label: salesChannelLabels.TAB, value: "TAB" },
  { label: salesChannelLabels.TABLE, value: "TABLE" },
  { label: salesChannelLabels.COUNTER, value: "COUNTER" },
  { label: salesChannelLabels.POS, value: "POS" },
  { label: salesChannelLabels.TAKEOUT, value: "TAKEOUT" },
  { label: salesChannelLabels.DELIVERY, value: "DELIVERY" }
];

function formatQuantity(value: number, isWeighable: boolean) {
  return isWeighable
    ? `${value.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`
    : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} un`;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function normalizeStatus(value?: string): CashOrderStatusFilter {
  return value === "paid" || value === "all" ? value : "pending";
}

function normalizeChannel(value?: string): SalesChannel | "all" {
  return channelOptions.some((option) => option.value === value) ? (value as SalesChannel | "all") : "all";
}

function cashHref(params: Record<string, string | undefined>): Route {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return (query ? `/operacao/caixa?${query}` : "/operacao/caixa") as Route;
}

export default async function OperationCashPage({ searchParams }: OperationCashPageProps) {
  const session = await requirePagePermission("cash.manage");
  const tabFilter = searchParams?.comanda?.trim() ?? "";
  const searchFilter = searchParams?.busca?.trim() ?? "";
  const statusFilter = normalizeStatus(searchParams?.status);
  const channelFilter = normalizeChannel(searchParams?.canal);
  const [register, orders, methods, operationSettings, cancellationRequests] = await Promise.all([
    getOpenCashRegisterSummary(),
    listCashOrders({
      channel: channelFilter,
      search: searchFilter,
      status: statusFilter,
      tabQuery: tabFilter
    }),
    db.paymentMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      where: { active: true }
    }),
    getOperationSettings(),
    listPendingCancellationRequests()
  ]);
  const paymentMethods = methods.map((method) => ({
    label: method.name || paymentMethodLabels[method.type],
    value: method.type
  }));
  const filteredTotal = orders.reduce((sum, order) => sum + order.total, 0);
  const filteredPaid = orders.reduce((sum, order) => sum + order.paid, 0);
  const filteredRemaining = orders.reduce((sum, order) => sum + order.remaining, 0);
  const filteredItemsCount = orders.reduce((sum, order) => sum + order.items.length, 0);
  const pendingOrdersCount = orders.filter((order) => order.remaining > 0).length;
  const paidOrdersCount = orders.filter((order) => order.remaining <= 0).length;
  const canAdjustOrderValue = session.permissions.includes("sales.manage");
  const canOpenCashRegister = session.permissions.includes("cash.open");
  const canChargeCash = session.permissions.includes("cash.charge");
  const canRefundPayments = session.permissions.includes("cash.refund");
  const canSupplyCash = session.permissions.includes("cash.supply");
  const canWithdrawCash = session.permissions.includes("cash.withdraw");
  const canCloseCashRegister = session.permissions.includes("cash.close");
  const hasFilters = Boolean(tabFilter || searchFilter || channelFilter !== "all" || statusFilter !== "pending");
  const reportLinks = [
    session.permissions.includes("dashboard.view")
      ? {
          description: "Pedidos, comandas, canais, total vendido e pagamentos.",
          exportHref: "/api/admin/reports/sales" as const,
          href: "/admin/relatorios/vendas" as const,
          title: "Relatorio de vendas"
        }
      : null,
    session.permissions.includes("financial.view")
      ? {
          description: "Caixas, formas de pagamento, sangrias, suprimentos e divergencias.",
          exportHref: "/api/admin/reports/financial" as const,
          href: "/admin/financeiro" as const,
          title: "Fechamento financeiro"
        }
      : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-4 border-b border-slate-200 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Caixa</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cobre comandas, imprima pre-conta, registre pagamentos e feche o turno.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/operacao/comandas"
            >
              Comandas
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/operacao/pedidos"
            >
              Lancar item
            </Link>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Pedidos filtrados</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{orders.length}</p>
              <p className="mt-1 text-sm text-slate-500">
                {pendingOrdersCount} pendente{pendingOrdersCount === 1 ? "" : "s"} / {paidOrdersCount} pago
                {paidOrdersCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">A receber</p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">{money(filteredRemaining)}</p>
              <p className="mt-1 text-sm text-slate-500">Saldo aberto dos pedidos exibidos.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Recebido</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{money(filteredPaid)}</p>
              <p className="mt-1 text-sm text-slate-500">Pagamentos ja registrados.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Consumo</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{money(filteredTotal)}</p>
              <p className="mt-1 text-sm text-slate-500">{filteredItemsCount} itens nos pedidos.</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            {register ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Caixa do turno</p>
                    <p className="mt-1 font-semibold text-slate-950">{register.code}</p>
                  </div>
                  <Badge tone="success">Aberto</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Abertura</p>
                    <p className="font-semibold text-slate-950">{money(register.openingAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Esperado</p>
                    <p className="font-semibold text-slate-950">{money(register.expectedAmount)}</p>
                  </div>
                </div>
                {pendingOrdersCount > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Quite ou cancele os pedidos pendentes antes de fechar o caixa.
                  </div>
                )}
                <details className="rounded-lg border border-slate-200 bg-white">
                  <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-slate-900">
                    Sangria, suprimento e fechamento
                  </summary>
                  <div className="space-y-4 border-t border-slate-200 p-3">
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-900">Suprimento e sangria</p>
                      <CashMovementForm canSupplyCash={canSupplyCash} canWithdrawCash={canWithdrawCash} />
                    </div>
                    {canCloseCashRegister ? (
                      <div>
                        <p className="mb-2 text-sm font-medium text-slate-900">Fechamento</p>
                        <CashRegisterCloseForm expectedAmount={register.expectedAmount} />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Fechar caixa exige permissao especifica do perfil.
                      </div>
                    )}
                    {register.movements.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Ultimas movimentacoes
                        </p>
                        {register.movements.map((movement) => (
                          <div
                            key={movement.id}
                            className="grid gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[1fr_auto]"
                          >
                            <div>
                              <p className="font-medium text-slate-700">{movement.typeLabel}</p>
                              <p className="text-slate-500">{movement.reason}</p>
                            </div>
                            <p className={movement.type === "SUPPLY" ? "text-emerald-700" : "text-red-700"}>
                              {movement.type === "SUPPLY" ? "+" : "-"}
                              {money(movement.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ) : (
              <CashRegisterOpenForm canOpenCashRegister={canOpenCashRegister} />
            )}
          </div>
        </div>
      </section>

      {cancellationRequests.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-2 border-b border-amber-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-amber-950">Cancelamentos aguardando aprovacao</h3>
              <p className="mt-1 text-sm text-amber-800">Revise os pedidos antes de remover itens da comanda.</p>
            </div>
            <Badge tone="warning">{cancellationRequests.length}</Badge>
          </div>
          <div className="divide-y divide-amber-200">
            {cancellationRequests.map((request) => (
              <div key={request.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_320px] lg:items-start">
                <div className="text-sm">
                  <p className="font-semibold text-amber-950">
                    {request.productName} - {money(request.totalPrice)}
                  </p>
                  <p className="mt-1 text-amber-800">
                    Pedido {request.orderNumber || "-"} | Comanda {request.tabLabel} | Solicitado por {request.requestedBy}
                  </p>
                  <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-amber-900">Motivo: {request.reason}</p>
                </div>
                <CancellationReviewForm requestId={request.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="space-y-4 border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Pedidos para fechamento</h3>
              <p className="mt-1 text-sm text-slate-500">
                Use os filtros para separar pendentes, pagos recentes, comanda, pedido, mesa ou cliente.
              </p>
            </div>
            {hasFilters && (
              <Link className="text-sm font-medium text-brand-700 hover:text-brand-800" href="/operacao/caixa">
                Limpar filtros
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Link
                key={option.value}
                className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition ${
                  statusFilter === option.value
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                href={cashHref({
                  busca: searchFilter,
                  canal: channelFilter === "all" ? undefined : channelFilter,
                  comanda: tabFilter,
                  status: option.value === "pending" ? undefined : option.value
                })}
              >
                {option.label}
              </Link>
            ))}
          </div>

          <form className="grid gap-3 xl:grid-cols-[160px_190px_1fr_auto_auto]" action="/operacao/caixa">
            <select
              className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              name="status"
              defaultValue={statusFilter}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-[15px] text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              name="canal"
              defaultValue={channelFilter}
            >
              {channelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              name="busca"
              placeholder="Buscar por pedido, comanda, mesa ou cliente"
              type="search"
              defaultValue={searchFilter}
            />
            <input
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              name="comanda"
              placeholder="Comanda"
              type="search"
              defaultValue={tabFilter}
            />
            <button className="h-12 rounded-lg bg-brand-600 px-5 text-[15px] font-semibold text-white transition hover:bg-brand-700">
              Filtrar
            </button>
          </form>

          {tabFilter && (
            <div className="flex flex-wrap gap-2">
              <Badge tone="warning">Comanda {tabFilter}</Badge>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                href={`/operacao/comandas?numero=${encodeURIComponent(tabFilter)}`}
              >
                Ver comanda
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                href={`/operacao/pedidos?comanda=${encodeURIComponent(tabFilter)}`}
              >
                Adicionar item
              </Link>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {orders.length === 0 ? (
            <div className="px-5 py-10">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-900">Nenhum pedido encontrado para estes filtros.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tente limpar os filtros ou lanca um item antes de tentar cobrar a comanda.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tabFilter && (
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={`/operacao/comandas?numero=${encodeURIComponent(tabFilter)}`}
                    >
                      Ver comanda
                    </Link>
                  )}
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
                    href={tabFilter ? `/operacao/pedidos?comanda=${encodeURIComponent(tabFilter)}` : "/operacao/pedidos"}
                  >
                    Lancar item
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            orders.map((order) => {
              const isPending = order.remaining > 0;

              return (
                <article key={order.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-950">Pedido {order.number}</p>
                          <Badge tone={isPending ? "warning" : "success"}>{order.statusLabel}</Badge>
                          <Badge>{order.channelLabel}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{order.label}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          {isPending ? "A receber" : "Quitado"}
                        </p>
                        <p className={`mt-0.5 text-xl font-semibold ${isPending ? "text-amber-700" : "text-emerald-700"}`}>
                          {money(isPending ? order.remaining : order.total)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-slate-500">Subtotal</p>
                        <p className="font-semibold text-slate-950">{money(order.subtotal)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Desconto</p>
                        <p className="font-semibold text-slate-950">{money(order.discount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Taxa</p>
                        <p className="font-semibold text-slate-950">{money(order.serviceCharge)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Pago</p>
                        <p className="font-semibold text-slate-950">{money(order.paid)}</p>
                      </div>
                    </div>

                    <details className="rounded-lg border border-slate-200 bg-white">
                      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-900">
                        <span>Itens do consumo</span>
                        <Badge>{order.items.length}</Badge>
                      </summary>
                      <div className="divide-y divide-slate-100 border-t border-slate-200">
                        {order.items.map((item) => (
                          <div key={item.id} className="grid gap-2 px-3 py-2 text-sm sm:grid-cols-[1fr_auto] sm:items-start">
                            <div>
                              <p className="font-medium text-slate-900">{item.productName}</p>
                              <p className="mt-1 text-slate-500">
                                {formatQuantity(item.weightKg || item.quantity, item.isWeighable)} x {money(item.unitPrice)}
                                {item.notes ? ` - ${item.notes}` : ""}
                              </p>
                            </div>
                            <p className="font-semibold text-slate-950 sm:text-right">{money(item.totalPrice)}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>

                  <div className="space-y-2">
                    {isPending ? (
                      <>
                        <Link
                          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-brand-100 bg-brand-50 px-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
                          href={`/operacao/recibos/${order.id}?tipo=consumo`}
                        >
                          Imprimir consumo antes de pagar
                        </Link>
                        {order.paid === 0 && canAdjustOrderValue && (
                          <details className="rounded-lg border border-slate-200 bg-white">
                            <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-slate-900">
                              Desconto e taxa
                            </summary>
                            <div className="border-t border-slate-200 p-3">
                              <OrderAdjustmentForm
                                salesOrderId={order.id}
                                subtotal={order.subtotal}
                                discount={order.discount}
                                serviceCharge={order.serviceCharge}
                                serviceChargePercent={operationSettings.serviceChargePercent}
                              />
                            </div>
                          </details>
                        )}
                        {order.paid === 0 && !canAdjustOrderValue && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Desconto e taxa exigem permissao para gerenciar vendas.
                          </div>
                        )}
                        {register && canChargeCash ? (
                          <>
                            <details className="rounded-lg border border-slate-200 bg-white">
                              <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-slate-900">
                                Receber agora
                              </summary>
                              <div className="space-y-3 border-t border-slate-200 p-3">
                                <QuickPaymentActions
                                  salesOrderId={order.id}
                                  remainingAmount={order.remaining}
                                  methods={paymentMethods}
                                />
                                <PaymentForm
                                  allowPartialPayments={operationSettings.allowPartialPayments}
                                  canRefundPayments={canRefundPayments}
                                  existingPayments={order.payments}
                                  itemReferences={order.items.map((item) => ({
                                    amount: item.totalPrice,
                                    id: item.id,
                                    label: item.productName
                                  }))}
                                  salesOrderId={order.id}
                                  suggestedAmount={order.remaining}
                                  methods={paymentMethods}
                                />
                              </div>
                            </details>
                          </>
                        ) : register ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Receber pagamento exige permissao especifica do perfil.
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Abra o caixa do turno antes de registrar pagamento nesta comanda.
                          </div>
                        )}
                        <details className="rounded-lg border border-slate-200 bg-slate-50">
                          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-slate-900">
                            Cancelamento auditado
                          </summary>
                          <div className="border-t border-slate-200 p-3">
                            <OrderCancelForm salesOrderId={order.id} />
                          </div>
                        </details>
                      </>
                    ) : (
                      <>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                          <Link
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                            href={`/operacao/recibos/${order.id}`}
                          >
                            Imprimir cupom
                          </Link>
                        </div>
                        {register && (
                          <details className="rounded-lg border border-slate-200 bg-white">
                            <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-slate-900">
                              Pagamentos registrados
                            </summary>
                            <div className="border-t border-slate-200 p-3">
                              <PaymentForm
                                allowNewPayment={false}
                                allowPartialPayments={operationSettings.allowPartialPayments}
                                canRefundPayments={canRefundPayments}
                                existingPayments={order.payments}
                                salesOrderId={order.id}
                                suggestedAmount={0}
                                methods={paymentMethods}
                              />
                            </div>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {reportLinks.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900">
            Relatorios e atalhos gerenciais
          </summary>
          <div className="border-t border-slate-200 p-5">
            <ContextualReportLinks
              title="Relatorios do caixa"
              description="Atalhos gerenciais aparecem apenas para usuarios com permissao administrativa."
              links={reportLinks}
            />
          </div>
        </details>
      )}
    </div>
  );
}
