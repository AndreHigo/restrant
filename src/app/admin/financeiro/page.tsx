import { requirePagePermission } from "@/lib/auth";
import { listFinancialDashboard } from "@/lib/services/financial";
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

export default async function AdminFinancialPage() {
  await requirePagePermission("financial.view");
  const dashboard = await listFinancialDashboard();
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
