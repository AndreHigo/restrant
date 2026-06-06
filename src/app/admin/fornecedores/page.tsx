import { requirePagePermission } from "@/lib/auth";
import { listSuppliers } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function SuppliersPage() {
  await requirePagePermission("suppliers.view");
  const items = await listSuppliers();

  return (
    <ResourceManager
      accentLabel="Compras"
      columns={[
        { key: "corporateName", label: "Razao social" },
        { key: "tradeName", label: "Nome fantasia" },
        { key: "document", label: "Documento" },
        { key: "contactName", label: "Contato" },
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
      description="Cadastro de fornecedores para solicitacoes, pedidos de compra e recebimento."
      endpoint="/api/admin/suppliers"
      fields={[
        { name: "corporateName", label: "Razao social", placeholder: "Fornecedor LTDA" },
        { name: "tradeName", label: "Nome fantasia", placeholder: "Fornecedor" },
        { name: "document", label: "CNPJ/CPF", placeholder: "00.000.000/0000-00" },
        { name: "contactName", label: "Contato", placeholder: "Responsavel comercial" },
        { name: "phone", label: "Telefone", placeholder: "(11) 99999-0000" },
        { name: "email", label: "E-mail", type: "email", placeholder: "contato@fornecedor.com" },
        { name: "active", label: "Fornecedor ativo", type: "checkbox" }
      ]}
      items={items}
      title="Fornecedores"
    />
  );
}
