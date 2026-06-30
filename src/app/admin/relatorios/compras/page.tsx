import Link from "next/link";
import { PurchaseOrderStatus } from "@prisma/client";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPurchaseReport, purchaseStatusLabels, type PurchaseReportRow } from "@/lib/services/reports";
import { Badge } from "@/components/ui/badge";
import { PrintReportItemButton } from "@/components/reports/print-report-item-button";

type PurchaseReportPageProps = {
  searchParams?: {
    status?: string;
    supplierId?: string;
  };
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function quantity(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "-";
}

function statusTone(status: PurchaseReportRow["status"]) {
  if (status === "RECEIVED") {
    return "success";
  }

  if (status === "CANCELED") {
    return "default";
  }

  return "warning";
}

export default async function PurchaseReportPage({ searchParams }: PurchaseReportPageProps) {
  await requirePagePermission("purchases.view");

  const [report, suppliers] = await Promise.all([
    getPurchaseReport(searchParams),
    db.supplier.findMany({ orderBy: { corporateName: "asc" }, select: { corporateName: true, id: true, tradeName: true } })
  ]);
  const exportParams = new URLSearchParams({
    status: report.filters.status,
    supplierId: report.filters.supplierId
  });

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Relatorio de compras</h3>
              <p className="mt-1 text-sm text-slate-500">
                Pedidos de compra, recebimentos, pendencias e exportacao CSV.
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
                href={`/api/admin/reports/purchases?${exportParams.toString()}`}
              >
                Exportar CSV
              </a>
            </div>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/admin/relatorios/compras">
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.supplierId}
              name="supplierId"
            >
              <option value="ALL">Todos os fornecedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradeName || supplier.corporateName}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              defaultValue={report.filters.status}
              name="status"
            >
              <option value="ALL">Todos os status</option>
              {Object.values(PurchaseOrderStatus).map((status) => (
                <option key={status} value={status}>
                  {purchaseStatusLabels[status]}
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
          <p className="mt-1 text-sm text-slate-500">{report.openOrders} em aberto</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total comprado</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.totalAmount)}</p>
          <p className="mt-1 text-sm text-slate-500">Dentro do filtro atual</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pendente</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.pendingAmount)}</p>
          <p className="mt-1 text-sm text-slate-500">Pedidos nao recebidos</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Recebido</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{money(report.receivedAmount)}</p>
          <p className="mt-1 text-sm text-slate-500">Compras concluidas</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-base font-semibold text-slate-950">Pedidos encontrados</h4>
          <p className="mt-1 text-sm text-slate-500">Mostrando ate 300 pedidos de compra.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Fornecedor</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Itens</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Recebido</th>
                <th className="px-5 py-3 font-medium">Pendente</th>
                <th className="px-5 py-3 font-medium">Datas</th>
                <th className="px-5 py-3 font-medium">Impressao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
                    Nenhum pedido de compra encontrado para os filtros informados.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-5 py-4 font-medium text-slate-950">{row.number}</td>
                    <td className="px-5 py-4 text-slate-600">{row.supplierName}</td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(row.status)}>{row.statusLabel}</Badge>
                    </td>
                    <td className="max-w-[260px] px-5 py-4 text-slate-600">{row.itemSummary}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{money(row.totalAmount)}</td>
                    <td className="px-5 py-4 text-slate-600">{quantity(row.receivedQty)}</td>
                    <td className="px-5 py-4 text-slate-600">{quantity(row.pendingQty)}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>Prev. {date(row.expectedAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Rec. {date(row.receivedAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <PrintReportItemButton
                        title={`Compra ${row.number}`}
                        subtitle="Relatorio individual de compra"
                        fields={[
                          { label: "Pedido", value: row.number },
                          { label: "Fornecedor", value: row.supplierName },
                          { label: "Status", value: row.statusLabel },
                          { label: "Itens", value: row.itemSummary },
                          { label: "Total", value: money(row.totalAmount) },
                          { label: "Recebido", value: quantity(row.receivedQty) },
                          { label: "Pendente", value: quantity(row.pendingQty) },
                          { label: "Previsao", value: date(row.expectedAt) },
                          { label: "Recebimento", value: date(row.receivedAt) }
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
