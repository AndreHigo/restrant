import { AppShell } from "@/components/layout/app-shell";
import { canAccessAdmin, getSession } from "@/lib/auth";
import { getOperationSettings } from "@/lib/services/operation-settings";

export default async function OperationLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [session, operationSettings] = await Promise.all([
    getSession(),
    getOperationSettings()
  ]);

  return (
    <AppShell
      area="operacao"
      canAccessAdmin={session ? canAccessAdmin(session.role) : false}
      currentUser={session ? { email: session.email, name: session.name, role: session.role } : undefined}
      operationSettings={operationSettings}
      permissions={session?.permissions ?? []}
      title="Painel operacional"
      subtitle="PDV, comandas, balanca, cozinha e caixa conforme os modos ativos do restaurante."
    >
      {children}
    </AppShell>
  );
}
