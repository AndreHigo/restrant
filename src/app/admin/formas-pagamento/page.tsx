import { requirePagePermission } from "@/lib/auth";
import { listPaymentMethods } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function PaymentMethodsPage() {
  await requirePagePermission("payment_methods.view");
  const items = await listPaymentMethods();

  return (
    <ResourceManager
      accentLabel="Caixa"
      columns={[
        { key: "name", label: "Forma de pagamento" },
        { key: "type", label: "Tipo" },
        { key: "sortOrder", label: "Ordem" },
        {
          key: "requiresAuthorization",
          label: "Autorizacao",
          format: "badge",
          badgeMap: {
            true: { label: "Requer", tone: "warning" },
            false: { label: "Nao requer", tone: "default" }
          }
        },
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
      description="Cadastro das formas aceitas no caixa, com ordenacao e sinalizacao de autorizacao."
      endpoint="/api/admin/payment-methods"
      fields={[
        { name: "name", label: "Nome", placeholder: "PIX" },
        {
          name: "type",
          label: "Tipo",
          type: "select",
          options: [
            { label: "Dinheiro", value: "CASH" },
            { label: "Cartao de credito", value: "CREDIT_CARD" },
            { label: "Cartao de debito", value: "DEBIT_CARD" },
            { label: "PIX", value: "PIX" },
            { label: "Voucher", value: "VOUCHER" },
            { label: "Transferencia", value: "BANK_TRANSFER" }
          ]
        },
        { name: "sortOrder", label: "Ordem", type: "number", placeholder: "1" },
        { name: "active", label: "Forma ativa", type: "checkbox" },
        {
          name: "requiresAuthorization",
          label: "Exige autorizacao",
          type: "checkbox"
        }
      ]}
      items={items}
      title="Formas de pagamento"
    />
  );
}
