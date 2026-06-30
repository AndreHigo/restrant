import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { PasswordChangeForm } from "@/components/profile/password-change-form";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function ProfilePage() {
  const session = await requireSession();
  const homeHref = session.permissions.includes("dashboard.view") ? "/admin" : "/operacao";

  return (
    <main className="min-h-screen bg-[#f5f4ee] p-5 lg:p-8">
      <section className="mx-auto max-w-4xl rounded-[24px] bg-white shadow-panel">
        <header className="border-b border-slate-100 px-6 py-5 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-700">Perfil</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950">Preferencias do usuario</h1>
              <p className="mt-1 text-sm text-slate-500">Dados da sessao e configuracoes pessoais do operador.</p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={homeHref}
            >
              Voltar
            </Link>
          </div>
        </header>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <div className="space-y-6">
            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Usuario logado</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">{session.name}</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-slate-500">Identificador</dt>
                  <dd className="mt-1 text-slate-950">{session.email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Perfil</dt>
                  <dd className="mt-1 text-slate-950">{roleLabel(session.role)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Permissoes carregadas</dt>
                  <dd className="mt-1 text-slate-950">{session.permissions.length}</dd>
                </div>
              </dl>
            </article>

            <PasswordChangeForm />
          </div>

          <div className="space-y-6">
            <ProfileDetailsForm email={session.email} name={session.name} />

            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Preferencias</p>
              <div className="mt-4 space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <input className="mt-1 h-4 w-4 rounded border-slate-300" defaultChecked type="checkbox" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">Confirmar acoes sensiveis</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-500">
                      Mantem confirmacao visual para cancelamentos, ajustes de pedido e operacoes de caixa.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <input className="mt-1 h-4 w-4 rounded border-slate-300" defaultChecked type="checkbox" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">Mostrar atalhos operacionais</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-500">
                      Mantem atalhos rapidos para pedidos, comandas, balanca e caixa conforme permissoes.
                    </span>
                  </span>
                </label>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
