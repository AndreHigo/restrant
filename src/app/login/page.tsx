import { LoginForm } from "@/components/auth/login-form";
import { ChefHatIcon, ShieldCheckIcon, WalletIcon } from "@/components/ui/icons";

const highlights = [
  {
    title: "Controle operacional",
    text: "PDV, comandas, mesas, cozinha e fechamento de conta com fluxo unico."
  },
  {
    title: "Governanca de acesso",
    text: "Permissoes por modulo e acao, trilha de auditoria e sessoes seguras."
  },
  {
    title: "Pronto para escalar",
    text: "Base preparada para estoque, compras, fiscal, financeiro e integracao com balanca."
  }
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(109,129,72,0.12),_transparent_35%),linear-gradient(180deg,_#f6f5ef_0%,_#edeae1_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="flex flex-col justify-between rounded-[28px] bg-slate-950 p-8 text-white lg:p-12">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Sistema de restaurante</p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight">
              Operacao, gestao e controle em uma base preparada para producao.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300">
              Stack moderna com Next.js, Prisma, PostgreSQL, autenticao JWT, RBAC e arquitetura pronta para evoluir.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheckIcon className="h-5 w-5 text-brand-300" />
              <p className="mt-4 text-sm font-medium">Seguranca</p>
              <p className="mt-2 text-sm text-slate-400">Rotas protegidas e trilhas de auditoria persistentes.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ChefHatIcon className="h-5 w-5 text-accent-300" />
              <p className="mt-4 text-sm font-medium">Operacao</p>
              <p className="mt-2 text-sm text-slate-400">Mesa, balcao, delivery, comanda e cozinha no mesmo fluxo.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <WalletIcon className="h-5 w-5 text-emerald-300" />
              <p className="mt-4 text-sm font-medium">Financeiro</p>
              <p className="mt-2 text-sm text-slate-400">Caixa, pagamentos e base pronta para conciliacao e fiscal.</p>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[28px] bg-white p-8 shadow-panel lg:p-10">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.16em] text-brand-700">Acesso</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Entrar no painel</h2>
              <p className="mt-2 text-sm text-slate-500">
                Use o usuario inicial para acessar a base da Fase 1.
              </p>
            </div>

            <LoginForm />

            <div className="mt-8 space-y-3 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">Credenciais iniciais do seed</p>
              <div className="text-sm text-slate-600">
                <p>Usuario: admin@restaurante.local</p>
                <p>Senha: Admin@123</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
