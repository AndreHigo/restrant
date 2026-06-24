import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
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

const adminItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/usuarios", label: "Usuarios", icon: UsersIcon },
  { href: "/admin/categorias", label: "Categorias", icon: TagsIcon },
  { href: "/admin/produtos", label: "Produtos", icon: PackageIcon },
  { href: "/admin/insumos", label: "Insumos", icon: CarrotIcon },
  { href: "/admin/clientes", label: "Clientes", icon: UserRoundIcon },
  { href: "/admin/fornecedores", label: "Fornecedores", icon: TruckIcon },
  { href: "/admin/funcionarios", label: "Funcionarios", icon: UsersIcon },
  { href: "/admin/mesas", label: "Mesas", icon: UtensilsIcon },
  { href: "/admin/comandas", label: "Comandas", icon: ReceiptIcon },
  { href: "/admin/formas-pagamento", label: "Formas de pagto", icon: WalletIcon },
  { href: "/admin/estoque", label: "Estoque", icon: BoxesIcon },
  { href: "/admin/fichas-tecnicas", label: "Fichas tecnicas", icon: FlaskIcon },
  { href: "/admin/inventario", label: "Inventario", icon: ClipboardListIcon },
  { href: "/admin/compras", label: "Compras", icon: ShoppingCartIcon },
  { href: "/admin/financeiro", label: "Financeiro", icon: WalletIcon },
  { href: "/admin/fiscal", label: "Fiscal", icon: ScrollTextIcon },
  { href: "/admin/balanca", label: "Balanca", icon: ScaleIcon },
  { href: "/admin/auditoria", label: "Auditoria", icon: ShieldCheckIcon },
  { href: "/admin/configuracoes", label: "Configuracoes", icon: SettingsIcon }
] as const satisfies ReadonlyArray<{ href: Route; label: string; icon: typeof LayoutDashboardIcon }>;

const operationItems = [
  { href: "/operacao", label: "Painel", icon: LayoutDashboardIcon },
  { href: "/operacao/pedidos", label: "Pedidos", icon: ClipboardListIcon },
  { href: "/operacao/comandas", label: "Comandas", icon: ReceiptIcon },
  { href: "/operacao/balanca", label: "Balanca", icon: ScaleIcon },
  { href: "/operacao/cozinha", label: "Cozinha", icon: ChefHatIcon },
  { href: "/operacao/caixa", label: "Caixa", icon: WalletIcon }
] as const satisfies ReadonlyArray<{ href: Route; label: string; icon: typeof LayoutDashboardIcon }>;

export function AppShell({
  area,
  title,
  subtitle,
  children
}: {
  area: "admin" | "operacao";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const items = area === "admin" ? adminItems : operationItems;
  const areaSwitch = area === "admin"
    ? { href: "/operacao" as Route, label: "Ir para operacao" }
    : { href: "/admin" as Route, label: "Ir para administracao" };

  return (
    <div className="min-h-screen bg-[#f5f4ee]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-950 px-6 py-8 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Restaurant Brasil</p>
            <h1 className="mt-3 text-2xl font-semibold">Gestao completa</h1>
            <p className="mt-2 text-sm text-slate-400">
              Operacao e administracao em uma unica base.
            </p>
          </div>

          <nav className="mt-10 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
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

        <main className="p-5 lg:p-8">
          <div className="rounded-[24px] bg-white shadow-panel">
            <header className="border-b border-slate-100 px-6 py-5 lg:px-8">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-700">{area}</p>
              <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-950">{title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    href={areaSwitch.href}
                  >
                    {areaSwitch.label}
                  </Link>
                  <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
                    Base pronta para controle de perfis, permissao por modulo e trilha de auditoria.
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
