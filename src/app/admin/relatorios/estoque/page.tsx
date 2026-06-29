import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { getStockReport, type StockReportRow } from "@/lib/services/reports";
import { Badge } from "@/components/ui/badge";

type StockReportPageProps = {
  searchParams?: {
    query?: string;
    status?: string;
  };
};

const statusOptions: Array<{ label: string; value: string }> = [
  { label: "Todos os status", value: "ALL" },
  { label: "Regular", value: "OK" },
  { label: "Estoque minimo", value: "LOW" },
  { label: "Vence em breve", value: "EXPIRING" },
  { label: "Vencido", value: "EXPIRED" }
];

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function quantity(value: number, unit: string) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3, minimumFractionDigits: 0 })} ${unit}`;
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "-";
}

function statusTone(status: StockReportRow["status"]) {
  if (status === "OK") {
    return "success";
  }

  if (status === "LOW" || status === "EXPIRING") {
    return "warning";
  }

  return "default";
}

export default async function StockReportPage({ searchParams }: StockReportPageProps) {
  await requirePagePermission("stock.view");

  const report = await getStockReport(searchParams);
  const exportParams = new URLSearchParams({
    query: report.filters.query,
    status: report.filters.status
  });

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Relatorio de estoque</h3>
              <p className="mt-1 text-sm text-slate-500">
                Saldos de insumos, estoque minimo, validade e movimentacoes dos ultimos 30 dias.
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
                href={`/api/admin/reports/stock?${exportParams.toString()}`}
              >
                Exportar CSV
              </a>
            </div>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/admin/relatorios/estoque">
            <input
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.query}
              name="query"
              placeholder="Buscar por SKU ou insumo"
              type="search"
            />
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.status}
              name="status"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Insumos</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{report.totalItems}</p>
          <p className="mt-1 text-sm text-slate-500">Dentro do filtro atual</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Valor em estoque</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.inventoryValue)}</p>
          <p className="mt-1 text-sm text-slate-500">Saldo atual x custo</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Minimo</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{report.lowStockItems}</p>
          <p className="mt-1 text-sm text-slate-500">Itens em alerta</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Validade</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{report.expiringItems + report.expiredItems}</p>
          <p className="mt-1 text-sm text-slate-500">Vencidos ou proximos</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-base font-semibold text-slate-950">Saldos encontrados</h4>
          <p className="mt-1 text-sm text-slate-500">Mostrando ate 300 insumos ordenados por nome.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Insumo</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Saldo</th>
                <th className="px-5 py-3 font-medium">Minimo</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Entradas 30d</th>
                <th className="px-5 py-3 font-medium">Saidas 30d</th>
                <th className="px-5 py-3 font-medium">Perdas 30d</th>
                <th className="px-5 py-3 font-medium">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
                    Nenhum insumo encontrado para os filtros informados.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-950">{row.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.sku}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(row.status)}>{row.statusLabel}</Badge>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">{quantity(row.currentStock, row.unit)}</td>
                    <td className="px-5 py-4 text-slate-600">{quantity(row.minimumStock, row.unit)}</td>
                    <td className="px-5 py-4 text-slate-600">{money(row.value)}</td>
                    <td className="px-5 py-4 text-slate-600">{quantity(row.recentIn, row.unit)}</td>
                    <td className="px-5 py-4 text-slate-600">{quantity(row.recentOut, row.unit)}</td>
                    <td className="px-5 py-4 text-slate-600">{quantity(row.recentLoss, row.unit)}</td>
                    <td className="px-5 py-4 text-slate-600">{date(row.expiresAt)}</td>
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
