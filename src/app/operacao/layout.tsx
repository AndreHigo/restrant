import { AppShell } from "@/components/layout/app-shell";
import { canAccessAdmin, getSession } from "@/lib/auth";

export default async function OperationLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <AppShell
      area="operacao"
      canAccessAdmin={session ? canAccessAdmin(session.role) : false}
      currentUser={session ? { email: session.email, name: session.name, role: session.role } : undefined}
      permissions={session?.permissions ?? []}
      title="Painel operacional"
      subtitle="PDV, pedidos por mesa, cozinha, comandas, balcao, retirada, delivery e caixa."
    >
      {children}
    </AppShell>
  );
}
