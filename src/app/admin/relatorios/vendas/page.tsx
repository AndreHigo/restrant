import Link from "next/link";
import { SalesChannel, SalesOrderStatus } from "@prisma/client";
import { requirePagePermission } from "@/lib/auth";
import { getSalesReport } from "@/lib/services/reports";
import { salesChannelLabels, salesStatusLabels } from "@/lib/services/operations";
import { Badge } from "@/components/ui/badge";

type SalesReportPageProps = {
  searchParams?: {
    channel?: string;
    end?: string;
    start?: string;
    status?: string;
  };
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function shortDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  });
}

function statusTone(status: SalesOrderStatus) {
  if (status === "PAID") {
    return "success";
  }

  if (status === "CANCELED") {
    return "default";
  }

  return "warning";
}

export default async function SalesReportPage({ searchParams }: SalesReportPageProps) {
  await requirePagePermission("dashboard.view");

  const report = await getSalesReport(searchParams);
  const exportParams = new URLSearchParams({
    channel: report.filters.channel,
    end: report.filters.end,
    start: report.filters.start,
    status: report.filters.status
  });

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Relatorio de vendas</h3>
              <p className="mt-1 text-sm text-slate-500">
                Filtros por periodo, canal e status com exportacao CSV.
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
                href={`/api/admin/reports/sales?${exportParams.toString()}`}
              >
                Exportar CSV
              </a>
            </div>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]" action="/admin/relatorios/vendas">
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
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.channel}
              name="channel"
            >
              <option value="ALL">Todos os canais</option>
              {Object.values(SalesChannel).map((channel) => (
                <option key={channel} value={channel}>
                  {salesChannelLabels[channel]}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.status}
              name="status"
            >
              <option value="ALL">Todos os status</option>
              {Object.values(SalesOrderStatus).map((status) => (
                <option key={status} value={status}>
                  {salesStatusLabels[status]}
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
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pedidos</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{report.totalOrders}</p>
          <p className="mt-1 text-sm text-slate-500">{report.paidOrders} pagos</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Receita bruta</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.totalRevenue)}</p>
          <p className="mt-1 text-sm text-slate-500">Sem pedidos cancelados</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Recebido</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.paidTotal)}</p>
          <p className="mt-1 text-sm text-slate-500">Pagamentos confirmados</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Ticket medio</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.averageTicket)}</p>
          <p className="mt-1 text-sm text-slate-500">Sobre pedidos pagos</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-base font-semibold text-slate-950">Pedidos encontrados</h4>
          <p className="mt-1 text-sm text-slate-500">Mostrando ate 300 registros mais recentes do filtro.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Abertura</th>
                <th className="px-5 py-3 font-medium">Canal</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Pago</th>
                <th className="px-5 py-3 font-medium">Restante</th>
                <th className="px-5 py-3 font-medium">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={8}>
                    Nenhuma venda encontrada para os filtros informados.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.number} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-950">{row.number}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.label}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{shortDate(row.openedAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{row.channelLabel}</td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(row.status)}>{row.statusLabel}</Badge>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">{money(row.total)}</td>
                    <td className="px-5 py-4 text-slate-600">{money(row.paid)}</td>
                    <td className="px-5 py-4 text-slate-600">{money(row.remaining)}</td>
                    <td className="px-5 py-4 text-slate-600">{row.paymentMethods}</td>
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
