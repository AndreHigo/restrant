import { LoginForm } from "@/components/auth/login-form";
import { ChefHatIcon, ReceiptIcon, WalletIcon } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ee]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="flex min-h-[360px] flex-col justify-between rounded-[24px] bg-slate-950 p-7 text-white lg:min-h-0 lg:p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Restaurant Brasil</p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight lg:text-5xl">
              Acesso da equipe
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Entre para operar comandas, caixa, cozinha, estoque e gestao conforme o seu perfil de acesso.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <ReceiptIcon className="h-5 w-5 text-brand-300" />
              <p className="mt-4 text-sm font-medium">Comandas</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <ChefHatIcon className="h-5 w-5 text-accent-300" />
              <p className="mt-4 text-sm font-medium">Producao</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <WalletIcon className="h-5 w-5 text-emerald-300" />
              <p className="mt-4 text-sm font-medium">Caixa</p>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[24px] bg-white p-7 shadow-panel lg:p-10">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.16em] text-brand-700">Acesso</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Entrar no painel</h2>
              <p className="mt-2 text-sm text-slate-500">
                Informe seu usuario e senha para continuar.
              </p>
            </div>

            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
