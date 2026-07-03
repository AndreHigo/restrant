import { requirePagePermission } from "@/lib/auth";
import { listDailyCashClosing, listFinancialDashboard } from "@/lib/services/financial";
import { Badge } from "@/components/ui/badge";
import { PayablePaymentForm } from "@/components/admin/payable-payment-form";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

type AdminFinancialPageProps = {
  searchParams?: {
    data?: string;
  };
};

export default async function AdminFinancialPage({ searchParams }: AdminFinancialPageProps) {
  await requirePagePermission("financial.view");
  const selectedDate = searchParams?.data;
  const [dashboard, dailyClosing] = await Promise.all([
    listFinancialDashboard(),
    listDailyCashClosing(selectedDate)
  ]);
  const payableOptions = dashboard.payables
    .filter((item) => item.canPay)
    .map((item) => ({
      code: item.purchaseOrderNumber || undefined,
      label: item.description,
      value: item.id,
      detail: `${item.supplierName} - ${formatCurrency(item.amount)}`
    }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">A pagar</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {formatCurrency(dashboard.kpis.pendingPayableAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pagas</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-700">
            {formatCurrency(dashboard.kpis.paidPayableAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">A receber</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">
            {formatCurrency(dashboard.kpis.pendingReceivableAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Vencidas</p>
          <p className="mt-3 text-3xl font-semibold text-red-700">{dashboard.kpis.overduePayablesCount}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Fechamento diario do caixa</h3>
              <p className="mt-1 text-sm text-slate-500">
                Consolidado por dia com caixas, pagamentos, estornos, sangrias, suprimentos e divergencias.
              </p>
            </div>
            <form className="grid gap-2 sm:grid-cols-[1fr_auto]" action="/admin/financeiro">
              <input
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                defaultValue={dailyClosing.selectedDate}
                name="data"
                type="date"
              />
              <button className="h-11 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700">
                Conferir dia
              </button>
            </form>
          </div>
        </div>
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">Recebido liquido</p>
              <p className="mt-2 text-xl font-semibold text-emerald-900">
                {formatCurrency(dailyClosing.kpis.paymentsTotal)}
              </p>
              <p className="mt-1 text-xs text-emerald-700">Pagamentos ainda validos no dia</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Estornos</p>
              <p className="mt-2 text-xl font-semibold text-red-900">
                {formatCurrency(dailyClosing.kpis.refundedToday)}
              </p>
              <p className="mt-1 text-xs text-red-700">Registrados na auditoria do dia</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Movimento liquido</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatCurrency(dailyClosing.kpis.netCashMovement)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Recebido + suprimento - saidas</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Divergencia caixa</p>
              <p
                className={
                  dailyClosing.kpis.cashDifference === 0
                    ? "mt-2 text-xl font-semibold text-slate-950"
                    : "mt-2 text-xl font-semibold text-amber-700"
                }
              >
                {formatCurrency(dailyClosing.kpis.cashDifference)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Contado menos esperado</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Caixas</p>
              <p className="mt-2 font-semibold text-slate-950">
                {dailyClosing.kpis.registersCount} no dia
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {dailyClosing.kpis.openRegistersCount} aberto(s), {dailyClosing.kpis.closedRegistersCount} fechado(s)
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pedidos</p>
              <p className="mt-2 font-semibold text-slate-950">
                {dailyClosing.kpis.ordersPaid} pagos
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {dailyClosing.kpis.ordersOpen} aberto(s), {dailyClosing.kpis.ordersCanceled} cancelado(s)
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Suprimentos</p>
              <p className="mt-2 font-semibold text-emerald-700">{formatCurrency(dailyClosing.kpis.supplies)}</p>
              <p className="mt-1 text-xs text-slate-500">Entradas manuais no caixa</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Sangrias/contas</p>
              <p className="mt-2 font-semibold text-red-700">
                {formatCurrency(dailyClosing.kpis.withdrawals + dailyClosing.kpis.payableOutflow)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Saidas registradas no dia</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="font-medium text-slate-950">Formas de pagamento do dia</p>
              </div>
              <div className="divide-y divide-slate-100">
                {dailyClosing.paymentMethods.length > 0 ? (
                  dailyClosing.paymentMethods.map((method) => (
                    <div key={method.method} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{method.label}</p>
                        <p className="text-xs text-slate-500">
                          {method.count} pagamento{method.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-950">{formatCurrency(method.amount)}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">Nenhum pagamento no dia selecionado.</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="font-medium text-slate-950">Estornos do dia</p>
              </div>
              <div className="divide-y divide-slate-100">
                {dailyClosing.refunds.length > 0 ? (
                  dailyClosing.refunds.map((refund) => (
                    <div key={refund.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">Pedido {refund.orderNumber}</p>
                        <p className="text-xs text-slate-500">
                          {refund.method} - {formatDateTime(refund.createdAt)}
                        </p>
                      </div>
                      <p className="font-semibold text-red-700">{formatCurrency(refund.amount)}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">Nenhum estorno no dia selecionado.</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="font-medium text-slate-950">Caixas considerados no fechamento</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Caixa</th>
                    <th className="px-4 py-3 font-medium">Periodo</th>
                    <th className="px-4 py-3 font-medium">Abertura</th>
                    <th className="px-4 py-3 font-medium">Recebido</th>
                    <th className="px-4 py-3 font-medium">Movimentos</th>
                    <th className="px-4 py-3 font-medium">Esperado</th>
                    <th className="px-4 py-3 font-medium">Contado</th>
                    <th className="px-4 py-3 font-medium">Dif.</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyClosing.registers.map((register) => (
                    <tr key={register.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{register.code}</p>
                        <Badge tone={register.status === "OPEN" ? "warning" : "success"}>{register.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(register.openedAt)}
                        <br />
                        {formatDateTime(register.closedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(register.openingAmount)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(register.paymentsTotal)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        +{formatCurrency(register.supplies)} / -{formatCurrency(register.withdrawals)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(register.expectedAmount)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(register.closingAmount)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(register.difference)}</td>
                    </tr>
                  ))}
                  {dailyClosing.registers.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={8}>
                        Nenhum caixa encontrado para o dia selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Fluxo de caixa consolidado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Visao gerencial dos recebimentos, pagamentos, suprimentos e sangrias dos ultimos 30 dias.
            </p>
          </div>
          <Badge tone={dashboard.cashFlow.netCashFlow >= 0 ? "success" : "warning"}>
            {dashboard.cashFlow.periodLabel}
          </Badge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">Entradas</p>
            <p className="mt-2 text-xl font-semibold text-emerald-900">
              {formatCurrency(dashboard.cashFlow.totalInflows)}
            </p>
            <p className="mt-1 text-xs text-emerald-700">Vendas + suprimentos</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Saidas</p>
            <p className="mt-2 text-xl font-semibold text-red-900">
              {formatCurrency(dashboard.cashFlow.totalOutflows)}
            </p>
            <p className="mt-1 text-xs text-red-700">Pagamentos + sangrias</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Saldo liquido</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(dashboard.cashFlow.netCashFlow)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Estimado no periodo</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Recebimentos</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(dashboard.cashFlow.salesInflow)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Pagamentos de vendas</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Mov. caixa</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(dashboard.cashFlow.supplies - dashboard.cashFlow.withdrawals)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Suprimento menos sangria</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Conferencia por forma de pagamento</h3>
          <p className="mt-1 text-sm text-slate-500">
            Base inicial para conciliacao de dinheiro, PIX, cartoes, voucher e transferencia.
          </p>
        </div>
        <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.cashFlow.paymentMethods.length > 0 ? (
            dashboard.cashFlow.paymentMethods.map((method) => (
              <div key={method.method} className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{method.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {method.count} pagamento{method.count === 1 ? "" : "s"} no periodo
                    </p>
                  </div>
                  <Badge tone="default">{method.method}</Badge>
                </div>
                <p className="mt-3 text-lg font-semibold text-brand-800">{formatCurrency(method.amount)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
              Nenhum pagamento recebido no periodo.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Contas a pagar</h3>
            <p className="mt-1 text-sm text-slate-500">
              Compras recebidas geram contas automaticamente para baixa financeira.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Descricao</th>
                  <th className="px-6 py-3 font-medium">Fornecedor</th>
                  <th className="px-6 py-3 font-medium">Vencimento</th>
                  <th className="px-6 py-3 font-medium">Valor</th>
                  <th className="px-6 py-3 font-medium">Pedido</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.payables.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{item.description}</p>
                      {item.overdue && <p className="text-xs font-medium text-red-700">Vencida</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.supplierName}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(item.dueDate)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 text-slate-600">{item.purchaseOrderNumber || "-"}</td>
                    <td className="px-6 py-4">
                      <Badge tone={item.status === "PAID" ? "success" : item.overdue ? "warning" : "default"}>
                        {item.statusLabel}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {dashboard.payables.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={6}>
                      Nenhuma conta a pagar encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Contas a receber</h3>
            <p className="mt-1 text-sm text-slate-500">
              Vendas pagas entram automaticamente como recebimentos.
            </p>
            <div className="mt-4 space-y-3">
              {dashboard.receivables.length > 0 ? (
                dashboard.receivables.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.customerName} {item.salesOrderNumber ? `- ${item.salesOrderNumber}` : ""}
                        </p>
                      </div>
                      <Badge tone={item.status === "PAID" ? "success" : "default"}>{item.statusLabel}</Badge>
                    </div>
                    <p className="mt-2 text-slate-600">
                      {formatCurrency(item.receivedAmount)} recebido de {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Nenhuma conta a receber encontrada.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Baixa financeira</h3>
            <p className="mt-1 text-sm text-slate-500">
              Registre o pagamento de uma conta pendente e mantenha auditoria.
            </p>
            <div className="mt-6">
              <PayablePaymentForm payables={payableOptions} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Caixas recentes</h3>
            <div className="mt-4 space-y-3">
              {dashboard.cashRegisters.length > 0 ? (
                dashboard.cashRegisters.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">{item.code}</span> - {item.status} - abertura{" "}
                    {formatCurrency(item.openingAmount)}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Nenhum caixa recente.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
