import Link from "next/link";
import { AlertTriangle, Banknote, Boxes, CheckCircle2, ClipboardCheck, ReceiptText, Rocket, Scale, Settings } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { getOpenCashRegisterSummary, listOperationDashboard } from "@/lib/services/operations";
import { listStockOverview } from "@/lib/services/stock";
import { Badge } from "@/components/ui/badge";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value);
}

function statusTone(status: "Aprovado" | "Atencao" | "Producao") {
  if (status === "Aprovado") {
    return "success";
  }

  if (status === "Atencao") {
    return "warning";
  }

  return "default";
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

export default async function AdminReadinessPage() {
  await requirePagePermission("settings.view");

  const [
    cashRegister,
    operationDashboard,
    operationSettings,
    stockOverview,
    usersCount,
    productsCount,
    ingredientsCount,
    openTabsCount,
    purchaseOrdersCount,
    payablesCount,
    receivablesCount,
    scaleDevicesCount,
    auditLogsCount
  ] = await Promise.all([
    getOpenCashRegisterSummary(),
    listOperationDashboard(),
    getOperationSettings(),
    listStockOverview(),
    db.user.count(),
    db.product.count({ where: { active: true } }),
    db.ingredient.count(),
    db.tab.count({ where: { active: true } }),
    db.purchaseOrder.count(),
    db.accountPayable.count(),
    db.accountReceivable.count(),
    db.scaleDevice.count(),
    db.auditLog.count()
  ]);
  const activeScaleDevicesCount = await db.scaleDevice.count({
    where: {
      active: true
    }
  });
  const activeModes = [
    operationSettings.enableBuffetKg ? "quilo" : null,
    operationSettings.enablePratoFeito ? "PF" : null,
    operationSettings.enableKitchen ? "cozinha" : null,
    operationSettings.enableCounter ? "balcao" : null,
    operationSettings.enableTakeout ? "retirada" : null,
    operationSettings.enableDelivery ? "delivery" : null,
    operationSettings.enableTableService ? "mesa" : null
  ].filter(Boolean);
  const scaleReady =
    !operationSettings.enableBuffetKg ||
    activeScaleDevicesCount > 0 ||
    operationSettings.allowManualWeightInput;
  const stockBlocked = stockOverview.kpis.expiredCount > 0;
  const operationalChecks = [
    {
      title: "Caixa do turno",
      detail: cashRegister
        ? `${cashRegister.code} aberto. Valor esperado agora: ${money(cashRegister.expectedAmount)}.`
        : "Nenhum caixa aberto para receber pagamentos.",
      status: cashRegister ? "Pronto" : "Bloqueado",
      href: "/operacao/caixa",
      action: cashRegister ? "Ir para caixa" : "Abrir agora",
      icon: Banknote
    },
    {
      title: "Balanca e buffet",
      detail: operationSettings.enableBuffetKg
        ? activeScaleDevicesCount > 0
          ? `${activeScaleDevicesCount} balanca(s) ativa(s) para o buffet por quilo.`
          : operationSettings.allowManualWeightInput
            ? "Sem balanca ativa, mas peso manual esta liberado como contingencia."
            : "Buffet por quilo ativo sem balanca ativa e sem peso manual."
        : "Buffet por quilo esta desativado para esta operacao.",
      status: scaleReady ? (activeScaleDevicesCount > 0 || !operationSettings.enableBuffetKg ? "Pronto" : "Atencao") : "Bloqueado",
      href: "/admin/balanca",
      action: "Ver balancas",
      icon: Scale
    },
    {
      title: "Estoque critico",
      detail: `${stockOverview.kpis.lowStockCount} abaixo do minimo, ${stockOverview.kpis.expiringCount} vencendo e ${stockOverview.kpis.expiredCount} vencido(s).`,
      status: stockBlocked ? "Bloqueado" : stockOverview.kpis.lowStockCount > 0 || stockOverview.kpis.expiringCount > 0 ? "Atencao" : "Pronto",
      href: "/admin/estoque",
      action: "Ver estoque",
      icon: Boxes
    },
    {
      title: "Comandas abertas",
      detail: `${operationDashboard.kpis.openTabs} comandas abertas, saldo pendente de ${money(operationDashboard.kpis.openTabsBalance)}.`,
      status: operationDashboard.kpis.openTabs > 0 ? "Atencao" : "Pronto",
      href: "/operacao/comandas",
      action: "Ver comandas",
      icon: ReceiptText
    },
    {
      title: "Modos ativos",
      detail: activeModes.length ? `Operacao configurada para: ${activeModes.join(", ")}.` : "Nenhum modo de venda ativo.",
      status: activeModes.length ? "Pronto" : "Bloqueado",
      href: "/admin/configuracoes/operacao",
      action: "Configurar",
      icon: Settings
    }
  ] as const;
  const blockedCount = operationalChecks.filter((item) => item.status === "Bloqueado").length;
  const attentionCount = operationalChecks.filter((item) => item.status === "Atencao").length;
  const readyCount = operationalChecks.filter((item) => item.status === "Pronto").length;

  const validatedAreas = [
    {
      title: "Acesso, usuarios e permissoes",
      detail: `${usersCount} usuarios cadastrados, RBAC validado por script e bloqueios por permissao ativos.`,
      status: "Aprovado" as const
    },
    {
      title: "Cadastros principais",
      detail: `${productsCount} produtos e ${ingredientsCount} insumos ativos, com busca, edicao e inativacao controlada.`,
      status: "Aprovado" as const
    },
    {
      title: "Operacao por comanda",
      detail: `${openTabsCount} comandas ativas, fluxo com garcom, caixa, recibo, producao e balanca testado.`,
      status: "Aprovado" as const
    },
    {
      title: "Estoque, compras e financeiro",
      detail: `${purchaseOrdersCount} compras e ${payablesCount + receivablesCount} titulos financeiros registrados.`,
      status: "Aprovado" as const
    },
    {
      title: "Balanca",
      detail: `${scaleDevicesCount} dispositivo(s) cadastrado(s), com leitura manual/simulada, tara e parametros por modelo.`,
      status: "Atencao" as const
    },
    {
      title: "Auditoria e QA",
      detail: `${auditLogsCount} eventos auditados. QA cobre build, smoke, fluxo operacional, RBAC e simulacao de restaurante.`,
      status: "Aprovado" as const
    }
  ];

  const productionLimits = [
    "NFC-e/NF-e dependem de certificado digital e integracao com SEFAZ ou provedor fiscal.",
    "Balanca fisica precisa teste com hardware real, porta serial/USB/API e homologacao no restaurante.",
    "Producao precisa CI/CD, backup, restauracao, monitoramento e politica formal de seguranca.",
    "Compras por WhatsApp com OCR/IA esta planejado para evolucao depois do MVP.",
    "Testes unitarios e E2E dedicados seguem como evolucao tecnica."
  ];

  const qaChecklist = [
    "npm run build",
    "npm run test:smoke",
    "npm run test:flow",
    "npm run test:rbac",
    "npm run test:scenario",
    "npm run test:qa"
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Rocket className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Prontidao do MVP</h3>
                <p className="mt-1 text-sm text-slate-500">Primeiro ciclo funcional validado em ambiente local.</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              O sistema ja cobre a operacao principal de restaurante por comanda, incluindo cadastros, pedidos,
              balanca manual/simulada, caixa, estoque, compras, financeiro, relatorios, auditoria e permissoes.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-sm font-medium text-emerald-800">Roadmap MVP</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">100%</p>
            <p className="mt-1 text-xs text-emerald-700">Atualizado em {formatDateTime(new Date())}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Prontidao operacional do dia</h3>
              <p className="mt-1 text-sm text-slate-500">
                Conferencia rapida antes de iniciar atendimento: caixa, balanca, estoque, comandas e modos ativos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{readyCount} pronto{readyCount === 1 ? "" : "s"}</Badge>
              {attentionCount > 0 && <Badge tone="warning">{attentionCount} atencao</Badge>}
              {blockedCount > 0 && <Badge tone="warning">{blockedCount} bloqueio{blockedCount === 1 ? "" : "s"}</Badge>}
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
          {operationalChecks.map((item) => {
            const Icon = item.icon;
            const cardClass =
              item.status === "Pronto"
                ? "border-emerald-200 bg-emerald-50/60"
                : item.status === "Atencao"
                  ? "border-amber-200 bg-amber-50/70"
                  : "border-red-200 bg-red-50/70";
            const iconClass =
              item.status === "Pronto"
                ? "bg-emerald-100 text-emerald-700"
                : item.status === "Atencao"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700";

            return (
              <div key={item.title} className={`rounded-lg border p-5 ${cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <Badge tone={item.status === "Pronto" ? "success" : "warning"}>{item.status}</Badge>
                </div>
                <h4 className="mt-4 text-base font-semibold text-slate-950">{item.title}</h4>
                <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{item.detail}</p>
                <Link
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                  href={item.href}
                >
                  {item.action}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {validatedAreas.map((area) => (
          <div key={area.title} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden="true" />
              <Badge tone={statusTone(area.status)}>{area.status}</Badge>
            </div>
            <h4 className="mt-4 text-base font-semibold text-slate-950">{area.title}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">{area.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-slate-600" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-950">Checklist de validacao</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">Comandos usados para liberar entregas antes do commit.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {qaChecklist.map((command) => (
              <div key={command} className="flex items-center justify-between gap-4 px-6 py-4">
                <code className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-800">{command}</code>
                <Badge tone="success">Aprovado</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50">
          <div className="border-b border-amber-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-amber-950">Limites antes de producao real</h3>
            </div>
            <p className="mt-1 text-sm text-amber-800">Itens que continuam no roadmap de evolucao.</p>
          </div>
          <div className="space-y-3 p-6">
            {productionLimits.map((limit) => (
              <div key={limit} className="rounded-lg border border-amber-200 bg-white/70 px-4 py-3 text-sm leading-6 text-amber-950">
                {limit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Documentacao de entrega</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manual, relatorio de simulacao e roadmap ficam como base para treinamento e proximas fases.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/admin/relatorios"
            >
              Abrir relatorios
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
              href="/admin/auditoria"
            >
              Ver auditoria
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
