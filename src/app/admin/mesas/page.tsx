import { requirePagePermission } from "@/lib/auth";
import { listTables } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function TablesPage() {
  await requirePagePermission("tables.view");
  const items = await listTables();

  return (
    <ResourceManager
      accentLabel="Salao"
      columns={[
        { key: "code", label: "Codigo" },
        { key: "name", label: "Mesa" },
        { key: "seats", label: "Lugares" },
        { key: "ordersCount", label: "Pedidos" },
        {
          key: "active",
          label: "Status",
          format: "badge",
          badgeMap: {
            true: { label: "Ativa", tone: "success" },
            false: { label: "Inativa", tone: "warning" }
          }
        }
      ]}
      description="Cadastro de mesas para atendimento no salao e gestao dos pedidos por mesa."
      endpoint="/api/admin/tables"
      fields={[
        { name: "code", label: "Codigo", placeholder: "M10" },
        { name: "name", label: "Nome", placeholder: "Mesa 10" },
        { name: "seats", label: "Lugares", type: "number", placeholder: "4" },
        { name: "active", label: "Mesa ativa", type: "checkbox" }
      ]}
      initialValues={{
        active: true
      }}
      items={items}
      title="Mesas"
    />
  );
}
