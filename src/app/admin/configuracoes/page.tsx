import Link from "next/link";
import type { Route } from "next";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  BoxesIcon,
  ScaleIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
  WalletIcon
} from "@/components/ui/icons";

type SettingsShortcut = {
  title: string;
  description: string;
  href: Route;
  metric: string;
  status: "MVP" | "Parcial";
  icon: typeof SettingsIcon;
};

type SettingsGroup = {
  title: string;
  description: string;
  shortcuts: SettingsShortcut[];
};

function statusTone(status: SettingsShortcut["status"]) {
  return status === "MVP" ? "success" : "warning";
}

export default async function AdminSettingsPage() {
  await requirePagePermission("settings.view");

  const [
    usersCount,
    rolesCount,
    paymentMethodsCount,
    activeTabsCount,
    fiscalCompany,
    activeScaleDevicesCount,
    auditLogsCount
  ] = await Promise.all([
    db.user.count(),
    db.role.count(),
    db.paymentMethod.count({
      where: {
        active: true
      }
    }),
    db.tab.count({
      where: {
        active: true
      }
    }),
    db.companySetting.findFirst({
      select: {
        tradeName: true,
        fiscalEnvironment: true
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.scaleDevice.count({
      where: {
        active: true
      }
    }),
    db.auditLog.count()
  ]);

  const groups: SettingsGroup[] = [
    {
      title: "Entrega e qualidade",
      description: "Prontidao do MVP, checklist de QA e limites para producao real.",
      shortcuts: [
        {
          title: "Prontidao do MVP",
          description: "Resumo do que esta validado, comandos de QA e pendencias de producao.",
          href: "/admin/prontidao",
          metric: "MVP 100% validado",
          status: "MVP",
          icon: ShieldCheckIcon
        }
      ]
    },
    {
      title: "Acesso e seguranca",
      description: "Usuarios, perfis, permissoes e trilha de auditoria.",
      shortcuts: [
        {
          title: "Usuarios",
          description: "Controle de acesso ao sistema por colaborador.",
          href: "/admin/usuarios",
          metric: `${usersCount} usuario${usersCount === 1 ? "" : "s"}`,
          status: "Parcial",
          icon: UsersIcon
        },
        {
          title: "Perfis e permissoes",
          description: "Base RBAC para liberar modulos e acoes por papel.",
          href: "/admin/perfis",
          metric: rolesCount === 1 ? "1 perfil" : `${rolesCount} perfis`,
          status: "MVP",
          icon: ShieldCheckIcon
        },
        {
          title: "Auditoria",
          description: "Historico de logins, cancelamentos e alteracoes sensiveis.",
          href: "/admin/auditoria",
          metric: `${auditLogsCount} evento${auditLogsCount === 1 ? "" : "s"}`,
          status: "MVP",
          icon: ShieldCheckIcon
        }
      ]
    },
    {
      title: "Empresa e fiscal",
      description: "Dados fiscais, ambiente de emissao e preparacao para NFC-e/NF-e.",
      shortcuts: [
        {
          title: "Fiscal",
          description: "Razao social, CNPJ, inscricoes e ambiente fiscal.",
          href: "/admin/fiscal",
          metric: fiscalCompany
            ? `${fiscalCompany.tradeName} - ${fiscalCompany.fiscalEnvironment}`
            : "Empresa nao configurada",
          status: "MVP",
          icon: ScrollTextIcon
        }
      ]
    },
    {
      title: "Operacao",
      description: "Parametros que impactam caixa, comanda, pagamentos e balanca.",
      shortcuts: [
        {
          title: "Formas de pagamento",
          description: "Meios aceitos no fechamento de conta.",
          href: "/admin/formas-pagamento",
          metric: `${paymentMethodsCount} ativa${paymentMethodsCount === 1 ? "" : "s"}`,
          status: "MVP",
          icon: WalletIcon
        },
        {
          title: "Comandas",
          description: "Faixas, status e estrutura de atendimento por comanda.",
          href: "/admin/comandas",
          metric: `${activeTabsCount} aberta${activeTabsCount === 1 ? "" : "s"}`,
          status: "MVP",
          icon: BoxesIcon
        },
        {
          title: "Balanca",
          description: "Dispositivos preparados para leitura serial, USB ou API.",
          href: "/admin/balanca",
          metric: `${activeScaleDevicesCount} dispositivo${activeScaleDevicesCount === 1 ? "" : "s"} ativo${activeScaleDevicesCount === 1 ? "" : "s"}`,
          status: "MVP",
          icon: ScaleIcon
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Central de configuracoes</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Parametros do sistema agrupados por contexto para evitar que tudo dependa da barra lateral.
            </p>
          </div>
          <Badge tone="success">Parametrizacao</Badge>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">{group.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{group.description}</p>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {group.shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;

              return (
                <Link
                  key={shortcut.title}
                  className="group flex min-h-[170px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:bg-brand-50"
                  href={shortcut.href}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-white group-hover:text-brand-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge tone={statusTone(shortcut.status)}>{shortcut.status}</Badge>
                    </div>
                    <h4 className="mt-4 text-base font-semibold text-slate-950">{shortcut.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{shortcut.description}</p>
                  </div>
                  <p className="mt-4 text-sm font-medium text-brand-800">{shortcut.metric}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
