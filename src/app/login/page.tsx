import { LoginForm } from "@/components/auth/login-form";
import { ChefHatIcon, ReceiptIcon, WalletIcon } from "@/components/ui/icons";

const loginErrors: Record<string, string> = {
  "credenciais-invalidas": "Usuario ou senha invalidos.",
  "dados-invalidos": "Confira o usuario e a senha informados.",
  "tentativas-excedidas": "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."
};

export default function LoginPage({
  searchParams
}: {
  searchParams?: {
    error?: string;
  };
}) {
  const initialError = searchParams?.error ? loginErrors[searchParams.error] ?? "" : "";

  return (
    <main className="min-h-screen bg-[#f5f4ee]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <section className="flex min-h-[390px] flex-col justify-between rounded-[24px] bg-slate-950 p-7 text-white lg:min-h-0 lg:p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-brand-200">Sistema de gestao para restaurante</p>
            <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-none text-white lg:text-6xl">
              Restaurant Brasil
            </h1>
            <p className="mt-5 max-w-lg text-xl font-medium leading-8 text-slate-100">
              Operacao por comanda, buffet por quilo, caixa e gestao em uma unica base.
            </p>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
              Acesse o painel para vender, acompanhar pedidos, controlar estoque, financeiro e permissao dos usuarios.
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
              <p className="text-sm uppercase tracking-[0.16em] text-brand-700">Login seguro</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Entrar no sistema</h2>
              <p className="mt-2 text-base leading-6 text-slate-500">
                Informe seu usuario e senha para continuar.
              </p>
            </div>

            <LoginForm initialError={initialError} />
          </div>
        </section>
      </div>
    </main>
  );
}
