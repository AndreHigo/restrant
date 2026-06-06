import { requirePagePermission } from "@/lib/auth";
import { listEmployees } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function EmployeesPage() {
  await requirePagePermission("employees.view");
  const items = await listEmployees();

  return (
    <ResourceManager
      accentLabel="Equipe"
      columns={[
        { key: "name", label: "Funcionario" },
        { key: "position", label: "Cargo" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
        {
          key: "status",
          label: "Status",
          format: "badge",
          badgeMap: {
            ACTIVE: { label: "ACTIVE", tone: "success" },
            INACTIVE: { label: "INACTIVE", tone: "warning" },
            ON_LEAVE: { label: "ON_LEAVE", tone: "warning" }
          }
        }
      ]}
      description="Cadastro da equipe operacional e administrativa, base para usuarios e permissoes."
      endpoint="/api/admin/employees"
      fields={[
        { name: "name", label: "Nome", placeholder: "Nome do funcionario" },
        { name: "position", label: "Cargo", placeholder: "Gerente, caixa, cozinheiro..." },
        { name: "document", label: "Documento", placeholder: "CPF" },
        { name: "phone", label: "Telefone", placeholder: "(11) 99999-0000" },
        { name: "email", label: "E-mail", type: "email", placeholder: "funcionario@email.com" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Ativo", value: "ACTIVE" },
            { label: "Inativo", value: "INACTIVE" },
            { label: "Afastado", value: "ON_LEAVE" }
          ]
        },
        { name: "hiredAt", label: "Admissao", type: "date" }
      ]}
      items={items}
      title="Funcionarios"
    />
  );
}
