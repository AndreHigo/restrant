import Link from "next/link";
import { PaymentStatus } from "@prisma/client";
import { requirePagePermission } from "@/lib/auth";
import { getFinancialReport, paymentStatusLabels, type FinancialReportRow } from "@/lib/services/reports";
import { Badge } from "@/components/ui/badge";
import { ExportReportPdfButton } from "@/components/reports/export-report-pdf-button";
import { PrintReportItemButton } from "@/components/reports/print-report-item-button";

type FinancialReportPageProps = {
  searchParams?: {
    status?: string;
    type?: string;
  };
};

const typeOptions = [
  { label: "Pagar e receber", value: "ALL" },
  { label: "A pagar", value: "PAYABLE" },
  { label: "A receber", value: "RECEIVABLE" }
];

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function date(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function statusTone(status: FinancialReportRow["status"]) {
  if (status === "PAID") {
    return "success";
  }

  if (status === "PENDING") {
    return "warning";
  }

  return "default";
}

export default async function FinancialReportPage({ searchParams }: FinancialReportPageProps) {
  await requirePagePermission("financial.view");

  const report = await getFinancialReport(searchParams);
  const exportParams = new URLSearchParams({
    status: report.filters.status,
    type: report.filters.type
  });
  const pdfRows = report.rows.map((row) => ({
    title: `${row.typeLabel} - ${row.description}`,
    fields: [
      { label: "Tipo", value: row.typeLabel },
      { label: "Descricao", value: row.description },
      { label: "Referencia", value: row.reference },
      { label: "Parte", value: row.counterparty },
      { label: "Vencimento", value: date(row.dueDate) },
      { label: "Status", value: row.statusLabel },
      { label: "Valor", value: money(row.amount) },
      { label: "Pago/recebido", value: money(row.paidAmount) },
      { label: "Restante", value: money(row.remaining) }
    ]
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Relatorio financeiro</h3>
              <p className="mt-1 text-sm text-slate-500">
                Contas a pagar, contas a receber, vencimentos e exportacao CSV e PDF.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                href="/admin/relatorios"
              >
                Voltar
              </Link>
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
                href={`/api/admin/reports/financial?${exportParams.toString()}`}
              >
                Exportar CSV
              </a>
              <ExportReportPdfButton
                filename="relatorio-financeiro.pdf"
                title="Relatorio financeiro"
                subtitle={`Tipo: ${report.filters.type} | Status: ${report.filters.status}`}
                summary={[
                  { label: "A pagar pendente", value: money(report.pendingPayables) },
                  { label: "A receber pendente", value: money(report.pendingReceivables) },
                  { label: "Recebido", value: money(report.receivedAmount) },
                  { label: "Vencidas", value: String(report.overdueCount) }
                ]}
                rows={pdfRows}
              />
            </div>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/admin/relatorios/financeiro">
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.type}
              name="type"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.status}
              name="status"
            >
              <option value="ALL">Todos os status</option>
              {Object.values(PaymentStatus).map((status) => (
                <option key={status} value={status}>
                  {paymentStatusLabels[status]}
                </option>
              ))}
            </select>
            <button className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800">
              Filtrar
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">A pagar</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.pendingPayables)}</p>
          <p className="mt-1 text-sm text-slate-500">Pendente</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">A receber</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.pendingReceivables)}</p>
          <p className="mt-1 text-sm text-slate-500">Pendente</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Recebido</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.receivedAmount)}</p>
          <p className="mt-1 text-sm text-slate-500">Contas recebidas</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Vencidas</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{report.overdueCount}</p>
          <p className="mt-1 text-sm text-slate-500">Pendencias vencidas</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-base font-semibold text-slate-950">Titulos encontrados</h4>
          <p className="mt-1 text-sm text-slate-500">Mostrando ate 300 registros ordenados por vencimento.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Descricao</th>
                <th className="px-5 py-3 font-medium">Parte</th>
                <th className="px-5 py-3 font-medium">Vencimento</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Pago/recebido</th>
                <th className="px-5 py-3 font-medium">Restante</th>
                <th className="px-5 py-3 font-medium">Impressao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
                    Nenhum titulo financeiro encontrado para os filtros informados.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="align-top">
                    <td className="px-5 py-4 font-medium text-slate-950">{row.typeLabel}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{row.description}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.reference}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{row.counterparty}</td>
                    <td className="px-5 py-4 text-slate-600">{date(row.dueDate)}</td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(row.status)}>{row.statusLabel}</Badge>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">{money(row.amount)}</td>
                    <td className="px-5 py-4 text-slate-600">{money(row.paidAmount)}</td>
                    <td className="px-5 py-4 text-slate-600">{money(row.remaining)}</td>
                    <td className="px-5 py-4">
                      <PrintReportItemButton
                        title={`${row.typeLabel} - ${row.description}`}
                        subtitle="Relatorio individual financeiro"
                        fields={[
                          { label: "Tipo", value: row.typeLabel },
                          { label: "Descricao", value: row.description },
                          { label: "Referencia", value: row.reference },
                          { label: "Parte", value: row.counterparty },
                          { label: "Vencimento", value: date(row.dueDate) },
                          { label: "Status", value: row.statusLabel },
                          { label: "Valor", value: money(row.amount) },
                          { label: "Pago/recebido", value: money(row.paidAmount) },
                          { label: "Restante", value: money(row.remaining) }
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
