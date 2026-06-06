import { requirePagePermission } from "@/lib/auth";
import { listCustomers } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function CustomersPage() {
  await requirePagePermission("customers.view");
  const items = await listCustomers();

  return (
    <ResourceManager
      accentLabel="Relacionamento"
      columns={[
        { key: "name", label: "Cliente" },
        { key: "document", label: "Documento" },
        { key: "phone", label: "Telefone" },
        { key: "email", label: "E-mail" },
        {
          key: "active",
          label: "Status",
          format: "badge",
          badgeMap: {
            true: { label: "Ativo", tone: "success" },
            false: { label: "Inativo", tone: "warning" }
          }
        }
      ]}
      description="Cadastro de clientes para salao, retirada, delivery e historico de pedidos."
      endpoint="/api/admin/customers"
      fields={[
        { name: "name", label: "Nome", placeholder: "Nome do cliente" },
        { name: "document", label: "Documento", placeholder: "CPF/CNPJ" },
        { name: "phone", label: "Telefone", placeholder: "(11) 99999-0000" },
        { name: "email", label: "E-mail", type: "email", placeholder: "cliente@email.com" },
        {
          name: "notes",
          label: "Observacoes",
          type: "textarea",
          placeholder: "Preferencias de atendimento"
        },
        { name: "active", label: "Cliente ativo", type: "checkbox" }
      ]}
      initialValues={{
        active: true
      }}
      items={items}
      title="Clientes"
    />
  );
}
