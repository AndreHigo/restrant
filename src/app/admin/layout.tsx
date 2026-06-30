import { AppShell } from "@/components/layout/app-shell";
import { requireAdminAccess } from "@/lib/auth";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccess();

  return (
    <AppShell
      area="admin"
      title="Painel administrativo"
      subtitle="Controle de usuarios, perfis, estoque, compras, financeiro, fiscal e configuracoes."
    >
      {children}
    </AppShell>
  );
}
