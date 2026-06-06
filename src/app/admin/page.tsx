import { requirePagePermission } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminKpis } from "@/lib/data/dashboard";

export default async function AdminDashboardPage() {
  await requirePagePermission("dashboard.view");
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminKpis.map((item) => (
          <Card key={item.title} title={item.title} value={item.value} caption={item.delta} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Mapa da Fase 1</h3>
              <p className="mt-1 text-sm text-slate-500">
                Estrutura base pronta para os modulos obrigatorios.
              </p>
            </div>
            <Badge tone="success">Base ativa</Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Autenticacao</p>
              <p className="mt-2 text-sm text-slate-500">
                JWT com cookie seguro, login, logout e rota de recuperacao preparada.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Autorizacao</p>
              <p className="mt-2 text-sm text-slate-500">
                Perfis e permissoes por modulo e acao persistidos no banco.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Modelagem de dados</p>
              <p className="mt-2 text-sm text-slate-500">
                Prisma com entidades de usuarios, vendas, estoque, compras, financeiro, fiscal e balanca.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">UI base</p>
              <p className="mt-2 text-sm text-slate-500">
                Shell administrativo e operacional responsivos e reutilizaveis.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-950">Proximas entregas</h3>
          <div className="mt-5 space-y-3">
            {[
              "Cadastros principais: produtos, categorias, fornecedores, clientes e funcionarios",
              "Telas de usuarios, perfis e permissoes com CRUD",
              "Mesas, comandas e formas de pagamento",
              "Servicos de listagem e validacao compartilhada"
            ].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
