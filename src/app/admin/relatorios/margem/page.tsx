import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { getMarginReport } from "@/lib/services/reports";
import { ExportReportPdfButton } from "@/components/reports/export-report-pdf-button";
import { PrintReportItemButton } from "@/components/reports/print-report-item-button";

type MarginReportPageProps = {
  searchParams?: {
    end?: string;
    start?: string;
  };
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function quantity(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default async function MarginReportPage({ searchParams }: MarginReportPageProps) {
  await requirePagePermission("dashboard.view");

  const report = await getMarginReport(searchParams);
  const exportParams = new URLSearchParams({
    end: report.filters.end,
    start: report.filters.start
  });
  const pdfRows = report.rows.map((row) => ({
    title: `${row.productName} (${row.sku})`,
    fields: [
      { label: "Codigo", value: row.sku },
      { label: "Produto", value: row.productName },
      { label: "Quantidade", value: quantity(row.quantity) },
      { label: "Receita", value: money(row.revenue) },
      { label: "CMV", value: money(row.cost) },
      { label: "CMV %", value: `${row.cmvPercent.toLocaleString("pt-BR")}%` },
      { label: "Margem", value: money(row.grossMargin) },
      { label: "Margem %", value: `${row.grossMarginPercent.toLocaleString("pt-BR")}%` }
    ]
  }));
  const lossPdfRows = report.lossRows.map((row) => ({
    title: `Desperdicio - ${row.ingredientName}`,
    fields: [
      { label: "Insumo", value: row.ingredientName },
      { label: "Quantidade", value: `${quantity(row.quantity)} ${row.unit}` },
      { label: "Custo medio", value: money(row.unitCost) },
      { label: "Valor perdido", value: money(row.value) }
    ]
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Relatorio de margem, CMV e desperdicio</h3>
              <p className="mt-1 text-sm text-slate-500">
                Margem por produto a partir de vendas pagas, ficha tecnica/custo do produto e perdas do periodo.
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
                href={`/api/admin/reports/margins?${exportParams.toString()}`}
              >
                Exportar CSV
              </a>
              <ExportReportPdfButton
                filename="relatorio-margem-cmv.pdf"
                title="Relatorio de margem, CMV e desperdicio"
                subtitle={`Periodo ${report.filters.start} ate ${report.filters.end}`}
                summary={[
                  { label: "Receita", value: money(report.totalRevenue) },
                  { label: "CMV", value: money(report.totalCost) },
                  { label: "Margem bruta", value: money(report.totalGrossMargin) },
                  { label: "Perdas", value: money(report.lossValue) },
                  { label: "Margem liquida", value: money(report.netMarginAfterLosses) }
                ]}
                rows={[...pdfRows, ...lossPdfRows]}
              />
            </div>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]" action="/admin/relatorios/margem">
            <input
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.start}
              name="start"
              type="date"
            />
            <input
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.end}
              name="end"
              type="date"
            />
            <button className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800">
              Filtrar
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Receita</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.totalRevenue)}</p>
          <p className="mt-1 text-sm text-slate-500">Vendas pagas no periodo</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">CMV</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.totalCost)}</p>
          <p className="mt-1 text-sm text-slate-500">{report.averageCmvPercent.toLocaleString("pt-BR")}% da receita</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Margem bruta</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.totalGrossMargin)}</p>
          <p className="mt-1 text-sm text-slate-500">Antes de perdas</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Perdas</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.lossValue)}</p>
          <p className="mt-1 text-sm text-slate-500">Margem liquida: {money(report.netMarginAfterLosses)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-base font-semibold text-slate-950">Desperdicio por insumo</h4>
          <p className="mt-1 text-sm text-slate-500">
            Perdas registradas no estoque durante o periodo, agrupadas por insumo.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Insumo</th>
                <th className="px-5 py-3 font-medium">Quantidade</th>
                <th className="px-5 py-3 font-medium">Custo medio</th>
                <th className="px-5 py-3 font-medium">Valor perdido</th>
                <th className="px-5 py-3 font-medium">Impressao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.lossRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                    Nenhuma perda registrada no periodo.
                  </td>
                </tr>
              ) : (
                report.lossRows.map((row) => (
                  <tr key={row.ingredientName} className="align-top">
                    <td className="px-5 py-4 font-medium text-slate-950">{row.ingredientName}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {quantity(row.quantity)} {row.unit}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{money(row.unitCost)}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{money(row.value)}</td>
                    <td className="px-5 py-4">
                      <PrintReportItemButton
                        title={`Desperdicio - ${row.ingredientName}`}
                        subtitle="Relatorio individual de perda no periodo"
                        fields={[
                          { label: "Insumo", value: row.ingredientName },
                          { label: "Quantidade", value: `${quantity(row.quantity)} ${row.unit}` },
                          { label: "Custo medio", value: money(row.unitCost) },
                          { label: "Valor perdido", value: money(row.value) }
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

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-base font-semibold text-slate-950">Margem por produto</h4>
          <p className="mt-1 text-sm text-slate-500">Ordenado por receita no periodo.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">Qtd.</th>
                <th className="px-5 py-3 font-medium">Receita</th>
                <th className="px-5 py-3 font-medium">CMV</th>
                <th className="px-5 py-3 font-medium">CMV %</th>
                <th className="px-5 py-3 font-medium">Margem</th>
                <th className="px-5 py-3 font-medium">Margem %</th>
                <th className="px-5 py-3 font-medium">Impressao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={8}>
                    Nenhuma venda paga encontrada para o periodo.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.sku} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-950">{row.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.sku}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{quantity(row.quantity)}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{money(row.revenue)}</td>
                    <td className="px-5 py-4 text-slate-600">{money(row.cost)}</td>
                    <td className="px-5 py-4 text-slate-600">{row.cmvPercent.toLocaleString("pt-BR")}%</td>
                    <td className="px-5 py-4 text-slate-600">{money(row.grossMargin)}</td>
                    <td className="px-5 py-4 text-slate-600">{row.grossMarginPercent.toLocaleString("pt-BR")}%</td>
                    <td className="px-5 py-4">
                      <PrintReportItemButton
                        title={`Margem - ${row.productName}`}
                        subtitle="Relatorio individual de margem e CMV"
                        fields={[
                          { label: "Codigo", value: row.sku },
                          { label: "Produto", value: row.productName },
                          { label: "Quantidade", value: quantity(row.quantity) },
                          { label: "Receita", value: money(row.revenue) },
                          { label: "CMV", value: money(row.cost) },
                          { label: "CMV %", value: `${row.cmvPercent.toLocaleString("pt-BR")}%` },
                          { label: "Margem", value: money(row.grossMargin) },
                          { label: "Margem %", value: `${row.grossMarginPercent.toLocaleString("pt-BR")}%` }
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
