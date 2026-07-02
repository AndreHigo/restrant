import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage({
  searchParams
}: {
  searchParams?: {
    token?: string;
  };
}) {
  const token = searchParams?.token ?? "";

  return (
    <main className="min-h-screen bg-[#f5f4ee] p-5 lg:p-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <div className="w-full rounded-[24px] bg-white p-8 shadow-panel">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-700">Restaurant Brasil</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Redefinir senha</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Crie uma nova senha para voltar a acessar o sistema.
            </p>
          </div>

          <ResetPasswordForm token={token} />
        </div>
      </section>
    </main>
  );
}
