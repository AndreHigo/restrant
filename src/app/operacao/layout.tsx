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
      title="Painel operacional"
      subtitle="PDV, pedidos por mesa, cozinha, comandas, balcao, retirada, delivery e caixa."
    >
      {children}
    </AppShell>
  );
}
