import { AppShell } from "@/components/layout/app-shell";

export default function OperationLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      area="operacao"
      title="Painel operacional"
      subtitle="PDV, pedidos por mesa, cozinha, comandas, balcao, retirada, delivery e caixa."
    >
      {children}
    </AppShell>
  );
}
