import { AppShell } from "@/components/layout/app-shell";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
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
