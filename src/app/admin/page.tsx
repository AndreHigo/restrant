import Link from "next/link";
import type { Route } from "next";
import { requirePagePermission } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminKpis } from "@/lib/data/dashboard";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { listOperationDashboard } from "@/lib/services/operations";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export default async function AdminDashboardPage() {
  await requirePagePermission("dashboard.view");
  const [operationDashboard, operationSettings] = await Promise.all([
    listOperationDashboard(),
    getOperationSettings()
  ]);
  const operationCards = [
    {
      label: "Comandas abertas",
      value: String(operationDashboard.kpis.openTabs),
      detail: `${operationDashboard.kpis.openTabsWithOrders} com pedido ativo`
    },
    {
      label: "Saldo em comandas",
      value: formatCurrency(operationDashboard.kpis.openTabsBalance),
      detail: "Valor pendente para caixa"
    },
    {
      label: "Pedidos abertos",
      value: String(operationDashboard.kpis.openOrders),
      detail: operationSettings.enableKitchen ? `${operationDashboard.kpis.kitchenOrders} na producao` : "Cozinha desativada"
    },
    {
      label: "Caixas ativos",
      value: String(operationDashboard.kpis.openRegisters),
      detail: operationDashboard.kpis.openRegisters > 0 ? "Operacao liberada" : "Abrir caixa antes de vender"
    }
  ];
  const nextActions = [
    {
      title: "Conferir comandas",
      description: "Veja comandas abertas, saldo pendente e retome lancamentos.",
      href: "/operacao/comandas" as Route,
      action: "Abrir comandas"
    },
    {
      title: "Acompanhar producao",
      description: operationSettings.enableKitchen
        ? "Itens em preparo, prontos e atrasados por setor."
        : "Modulo de cozinha esta desativado nas configuracoes.",
      href: "/operacao/producao" as Route,
      action: "Abrir producao",
      disabled: !operationSettings.enableKitchen
    },
    {
      title: "Fechar caixa",
      description: "Concilie pagamentos, sangrias, suprimentos e divergencias.",
      href: "/operacao/caixa" as Route,
      action: "Abrir caixa"
    },
    {
      title: "Ver prontidao do dia",
      description: "Cheque caixa, balanca, estoque, modos ativos e rotas criticas.",
      href: "/admin/prontidao" as Route,
      action: "Ver prontidao"
    }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminKpis.map((item) => (
          <Card key={item.title} title={item.title} value={item.value} caption={item.delta} />
        ))}
      </section>

      <section className="rounded-lg border border-brand-100 bg-brand-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Painel Operacional</h3>
            <p className="mt-1 text-sm text-slate-600">
              Acesse rapidamente pedidos, balanca, cozinha e caixa do restaurante.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
            href="/operacao"
          >
            Abrir operacao
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Situacao do restaurante agora</h3>
              <p className="mt-1 text-sm text-slate-500">
                Indicadores reais do operacional para o administrador acompanhar o turno.
              </p>
            </div>
            <Badge tone={operationDashboard.kpis.openRegisters > 0 ? "success" : "warning"}>
              {operationDashboard.kpis.openRegisters > 0 ? "Operando" : "Caixa fechado"}
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {operationCards.map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
                <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-950">Acoes rapidas de gestao</h3>
          <p className="mt-1 text-sm text-slate-500">
            Caminhos que o dono ou gerente usa para acompanhar a operacao.
          </p>
          <div className="mt-5 space-y-3">
            {nextActions.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </div>
                  {item.disabled ? (
                    <Badge tone="warning">Desativado</Badge>
                  ) : (
                    <Link
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={item.href}
                    >
                      {item.action}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
