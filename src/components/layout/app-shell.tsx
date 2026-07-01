import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { UserSessionMenu } from "@/components/layout/user-session-menu";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import {
  BoxesIcon,
  CarrotIcon,
  ChefHatIcon,
  ClipboardListIcon,
  FlaskIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptIcon,
  ScaleIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  TagsIcon,
  TruckIcon,
  UserRoundIcon,
  UsersIcon,
  UtensilsIcon,
  WalletIcon
} from "@/components/ui/icons";

type NavigationItem = {
  href: Route;
  label: string;
  icon: typeof LayoutDashboardIcon;
  permission: string;
};

type NavigationSection = {
  label: string;
  defaultOpen?: boolean;
  items: readonly NavigationItem[];
};

const adminSections = [
  {
    label: "Visao geral",
    defaultOpen: true,
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, permission: "dashboard.view" },
      { href: "/admin/relatorios", label: "Relatorios", icon: ScrollTextIcon, permission: "dashboard.view" }
    ]
  },
  {
    label: "Gestao",
    defaultOpen: true,
    items: [
      { href: "/admin/estoque", label: "Estoque", icon: BoxesIcon, permission: "stock.view" },
      { href: "/admin/inventario", label: "Inventario", icon: ClipboardListIcon, permission: "stock.view" },
      { href: "/admin/perdas", label: "Perdas", icon: ClipboardListIcon, permission: "stock.view" },
      { href: "/admin/compras", label: "Compras", icon: ShoppingCartIcon, permission: "purchases.view" },
      { href: "/admin/financeiro", label: "Financeiro", icon: WalletIcon, permission: "financial.view" }
    ]
  },
  {
    label: "Cadastros",
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: PackageIcon, permission: "products.view" },
      { href: "/admin/categorias", label: "Categorias", icon: TagsIcon, permission: "categories.view" },
      { href: "/admin/insumos", label: "Insumos", icon: CarrotIcon, permission: "ingredients.view" },
      { href: "/admin/fichas-tecnicas", label: "Fichas tecnicas", icon: FlaskIcon, permission: "products.view" },
      { href: "/admin/clientes", label: "Clientes", icon: UserRoundIcon, permission: "customers.view" },
      { href: "/admin/fornecedores", label: "Fornecedores", icon: TruckIcon, permission: "suppliers.view" },
      { href: "/admin/funcionarios", label: "Funcionarios", icon: UsersIcon, permission: "employees.view" },
      { href: "/admin/mesas", label: "Mesas", icon: UtensilsIcon, permission: "tables.view" },
      { href: "/admin/comandas", label: "Comandas", icon: ReceiptIcon, permission: "tabs.view" },
      { href: "/admin/formas-pagamento", label: "Formas de pagto", icon: WalletIcon, permission: "payment_methods.view" }
    ]
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: UsersIcon, permission: "users.view" },
      { href: "/admin/fiscal", label: "Fiscal", icon: ScrollTextIcon, permission: "fiscal.view" },
      { href: "/admin/balanca", label: "Balanca", icon: ScaleIcon, permission: "scale.view" },
      { href: "/admin/auditoria", label: "Auditoria", icon: ShieldCheckIcon, permission: "audit.view" },
      { href: "/admin/configuracoes", label: "Configuracoes", icon: SettingsIcon, permission: "settings.view" }
    ]
  }
] as const satisfies readonly NavigationSection[];

const operationSections = [
  {
    label: "Operacao",
    defaultOpen: true,
    items: [
      { href: "/operacao", label: "Painel", icon: LayoutDashboardIcon, permission: "sales.view" },
      { href: "/operacao/garcom", label: "Garcom", icon: UserRoundIcon, permission: "sales.view" },
      { href: "/operacao/pedidos", label: "Pedidos", icon: ClipboardListIcon, permission: "sales.view" },
      { href: "/operacao/comandas", label: "Comandas", icon: ReceiptIcon, permission: "sales.view" },
      { href: "/operacao/balanca", label: "Balanca", icon: ScaleIcon, permission: "sales.manage" },
      { href: "/operacao/cozinha", label: "Cozinha", icon: ChefHatIcon, permission: "sales.view" },
      { href: "/operacao/producao", label: "Producao", icon: ChefHatIcon, permission: "sales.view" },
      { href: "/operacao/caixa", label: "Caixa", icon: WalletIcon, permission: "cash.manage" }
    ]
  }
] as const satisfies readonly NavigationSection[];

export function AppShell({
  area,
  canAccessAdmin = true,
  currentUser,
  permissions = [],
  title,
  subtitle,
  children
}: {
  area: "admin" | "operacao";
  canAccessAdmin?: boolean;
  currentUser?: {
    email: string;
    name: string;
    role: string;
  };
  permissions?: string[];
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const permissionSet = new Set(permissions);
  const sections = (area === "admin" ? adminSections : operationSections)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => permissionSet.has(item.permission))
    }))
    .filter((section) => section.items.length > 0);
  const areaSwitch = area === "admin" || canAccessAdmin
    ? area === "admin"
      ? { href: "/operacao" as Route, label: "Ir para operacao" }
      : { href: "/admin" as Route, label: "Ir para administracao" }
    : null;
  const mobileItems = sections.flatMap((section) => section.items);

  return (
    <div className="min-h-screen bg-[#f5f4ee]">
      <div className="grid min-h-screen lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-slate-950 px-7 py-8 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Restaurant Brasil</p>
            <h1 className="mt-3 text-[28px] font-semibold leading-tight">Gestao completa</h1>
            <p className="mt-3 text-[15px] leading-6 text-slate-300">
              Operacao e administracao em uma unica base.
            </p>
          </div>

          <nav className="mt-9 space-y-5">
            {sections.map((section) => (
              <details
                key={section.label}
                className="group"
                open={"defaultOpen" in section ? section.defaultOpen : false}
              >
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 text-left text-slate-200 transition hover:bg-white/[0.06]">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.12em]">
                    {section.label}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-semibold text-slate-300 transition group-open:bg-white/10 group-open:text-white">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">-</span>
                  </span>
                </summary>
                <div className="mt-2 space-y-1.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group/link flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium leading-none text-slate-100 transition hover:bg-white/10 hover:text-white"
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400 transition group-hover/link:text-white" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            ))}
          </nav>

          <div className="mt-10 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Area ativa</span>
              <Badge tone="success">{area === "admin" ? "Admin" : "Operacao"}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Base viva com autenticacao, cadastros, estoque inicial e fluxo operacional em evolucao.
            </p>
          </div>
        </aside>

        <main className="min-w-0 p-3 sm:p-5 lg:p-8">
          <section className="mb-3 rounded-2xl bg-slate-950 p-4 text-white shadow-panel lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Restaurant Brasil
                </p>
                <h1 className="mt-1 text-xl font-semibold">Gestao completa</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PwaInstallButton />
                <Badge tone="success">{area === "admin" ? "Admin" : "Operacao"}</Badge>
              </div>
            </div>
            {currentUser ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                <p className="mt-1 truncate text-xs text-slate-300">{currentUser.email}</p>
              </div>
            ) : null}
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {mobileItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-medium text-white"
                    href={item.href}
                  >
                    <Icon className="h-4 w-4 text-slate-300" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </section>
          <div className="min-w-0 rounded-[24px] bg-white shadow-panel">
            <header className="border-b border-slate-100 px-6 py-5 lg:px-8">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-700">{area}</p>
              <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-950">{title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {areaSwitch ? (
                      <Link
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        href={areaSwitch.href}
                      >
                        {areaSwitch.label}
                      </Link>
                    ) : (
                      <button
                        aria-disabled="true"
                        className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400"
                        disabled
                        type="button"
                      >
                        Administracao bloqueada
                      </button>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    {currentUser ? <UserSessionMenu user={currentUser} /> : null}
                  </div>
                </div>
              </div>
            </header>
            <div className="px-6 py-6 lg:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
