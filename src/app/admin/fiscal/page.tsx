import { requirePagePermission } from "@/lib/auth";
import { getFiscalDashboard } from "@/lib/services/fiscal";
import { Badge } from "@/components/ui/badge";
import { FiscalSettingsForm } from "@/components/admin/fiscal-settings-form";
import { NfceHomologationPanel } from "@/components/admin/nfce-homologation-panel";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "AUTHORIZED") {
    return "success";
  }

  if (status === "REJECTED" || status === "CONTINGENCY") {
    return "warning";
  }

  return "default";
}

export default async function AdminFiscalPage() {
  await requirePagePermission("fiscal.view");
  const dashboard = await getFiscalDashboard();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Ambiente</p>
          <p className="mt-3 text-2xl font-semibold capitalize text-slate-950">
            {dashboard.company?.fiscalEnvironment ?? "homologacao"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Documentos</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{dashboard.kpis.documentsCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Autorizados</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-700">{dashboard.kpis.authorizedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Contingencia</p>
          <p className="mt-3 text-2xl font-semibold text-amber-700">{dashboard.kpis.contingencyCount}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Configuracao fiscal da empresa</h3>
            <p className="mt-1 text-sm text-slate-500">
              Dados base para NFC-e, NF-e e futuras integracoes fiscais brasileiras.
            </p>
          </div>
          <div className="p-6">
            <FiscalSettingsForm company={dashboard.company} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Historico fiscal recente</h3>
            <p className="mt-1 text-sm text-slate-500">
              Estrutura preparada para vincular vendas, documentos fiscais, contingencia e autorizacoes.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Documento</th>
                  <th className="px-6 py-3 font-medium">Venda</th>
                  <th className="px-6 py-3 font-medium">Emissao</th>
                  <th className="px-6 py-3 font-medium">Valor</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.documents.map((document) => (
                  <tr key={document.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {document.typeLabel} {document.number || "sem numero"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Serie {document.series || "-"} {document.contingency ? "- contingencia" : ""}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{document.salesOrderNumber || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(document.issuedAt || document.createdAt)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(document.salesOrderTotal)}</td>
                    <td className="px-6 py-4">
                      <Badge tone={statusTone(document.status)}>{document.statusLabel}</Badge>
                    </td>
                  </tr>
                ))}
                {dashboard.documents.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={5}>
                      Nenhum documento fiscal registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <NfceHomologationPanel
        pendingOrders={dashboard.pendingOrders}
        readiness={dashboard.readiness}
      />
    </div>
  );
}
