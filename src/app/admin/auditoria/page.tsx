import { requirePagePermission } from "@/lib/auth";
import { listAuditDashboard } from "@/lib/services/audit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function moduleLabel(module: string) {
  const labels: Record<string, string> = {
    cash: "Caixa",
    categories: "Categorias",
    customers: "Clientes",
    employees: "Funcionarios",
    financial: "Financeiro",
    ingredients: "Insumos",
    payment_methods: "Formas de pagamento",
    products: "Produtos",
    purchases: "Compras",
    sales: "Vendas",
    scale: "Balanca",
    stock: "Estoque",
    suppliers: "Fornecedores",
    tabs: "Comandas",
    tables: "Mesas"
  };

  return labels[module] ?? module;
}

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams?: {
    module?: string;
    action?: string;
    search?: string;
  };
}) {
  await requirePagePermission("audit.view");
  const dashboard = await listAuditDashboard(searchParams);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Eventos</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{dashboard.kpis.totalEvents}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Hoje</p>
          <p className="mt-3 text-3xl font-semibold text-brand-700">{dashboard.kpis.todayEvents}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Falhas de login hoje</p>
          <p className="mt-3 text-3xl font-semibold text-red-700">{dashboard.kpis.failedLogins}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Modulos auditados</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{dashboard.kpis.modulesCount}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Eventos auditados</h3>
            <p className="mt-1 text-sm text-slate-500">
              Consulta dos eventos persistidos por compras, caixa, estoque, financeiro e operacao.
            </p>
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto]" action="/admin/auditoria">
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                defaultValue={dashboard.filters.module}
                name="module"
              >
                <option value="">Todos os modulos</option>
                {dashboard.modules.map((item) => (
                  <option key={item.module} value={item.module}>
                    {moduleLabel(item.module)}
                  </option>
                ))}
              </select>
              <Input defaultValue={dashboard.filters.action} name="action" placeholder="Acao" />
              <Input defaultValue={dashboard.filters.search} name="search" placeholder="Buscar modulo, entidade ou id" />
              <Button type="submit">Filtrar</Button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Modulo</th>
                  <th className="px-6 py-3 font-medium">Acao</th>
                  <th className="px-6 py-3 font-medium">Entidade</th>
                  <th className="px-6 py-3 font-medium">Usuario</th>
                  <th className="px-6 py-3 font-medium">Dados</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.logs.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 text-slate-600">{formatDateTime(item.createdAt)}</td>
                    <td className="px-6 py-4">
                      <Badge>{moduleLabel(item.module)}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.action}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{item.entityType}</p>
                      <p className="max-w-40 truncate text-xs text-slate-400">{item.entityId || "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{item.userName}</p>
                      <p className="text-xs text-slate-400">{item.userEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-64 truncate text-xs text-slate-500" title={item.metadata}>
                        {item.metadata || "-"}
                      </p>
                    </td>
                  </tr>
                ))}
                {dashboard.logs.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={6}>
                      Nenhum evento encontrado para os filtros informados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Eventos por modulo</h3>
            <div className="mt-4 space-y-3">
              {dashboard.modules.map((item) => (
                <div key={item.module} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-700">{moduleLabel(item.module)}</span>
                  <Badge tone="success">{item.count}</Badge>
                </div>
              ))}
              {dashboard.modules.length === 0 && (
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Nenhum modulo auditado.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Logins recentes</h3>
            <div className="mt-4 space-y-3">
              {dashboard.loginLogs.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.userName || item.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                    </div>
                    <Badge tone={item.success ? "success" : "warning"}>{item.success ? "Sucesso" : "Falha"}</Badge>
                  </div>
                  <p className="mt-2 truncate text-xs text-slate-500">{item.email}</p>
                </div>
              ))}
              {dashboard.loginLogs.length === 0 && (
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Nenhum login registrado.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
