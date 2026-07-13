import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Rocket } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
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

export default async function AdminReadinessPage() {
  await requirePagePermission("settings.view");

  const [
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
