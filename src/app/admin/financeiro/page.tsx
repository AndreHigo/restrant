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
