import { requirePagePermission } from "@/lib/auth";
import { listTabs } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function TabsPage() {
  await requirePagePermission("tabs.view");
  const items = await listTabs();

  return (
    <ResourceManager
      accentLabel="Atendimento"
      columns={[
        { key: "number", label: "Numero" },
        { key: "customerName", label: "Cliente/identificacao" },
        { key: "ordersCount", label: "Pedidos" },
        {
          key: "active",
          label: "Status",
          format: "badge",
          badgeMap: {
            true: { label: "Aberta", tone: "success" },
            false: { label: "Fechada", tone: "warning" }
          }
        }
      ]}
      description="Cadastro e acompanhamento das comandas usadas no balcao e no atendimento."
      endpoint="/api/admin/tabs"
      fields={[
        { name: "number", label: "Numero", placeholder: "C2040" },
        { name: "customerName", label: "Identificacao", placeholder: "Varanda / Cliente" },
        { name: "active", label: "Comanda ativa", type: "checkbox" }
      ]}
      items={items}
      title="Comandas"
    />
  );
}
