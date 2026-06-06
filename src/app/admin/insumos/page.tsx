import { requirePagePermission } from "@/lib/auth";
import { listIngredients } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function IngredientsPage() {
  await requirePagePermission("ingredients.view");
  const items = await listIngredients();

  return (
    <ResourceManager
      accentLabel="Base de ficha tecnica"
      columns={[
        { key: "sku", label: "SKU" },
        { key: "name", label: "Insumo" },
        { key: "unit", label: "Unidade" },
        { key: "currentStock", label: "Estoque atual" },
        { key: "minimumStock", label: "Estoque minimo" }
      ]}
      description="Cadastro dos insumos que serao usados em estoque, perdas e fichas tecnicas."
      endpoint="/api/admin/ingredients"
      fields={[
        { name: "sku", label: "SKU", placeholder: "ING-100" },
        { name: "name", label: "Nome", placeholder: "Arroz integral" },
        { name: "unit", label: "Unidade", placeholder: "KG" },
        { name: "cost", label: "Custo", type: "number", step: "0.01", placeholder: "0.00" },
        {
          name: "minimumStock",
          label: "Estoque minimo",
          type: "number",
          step: "0.001",
          placeholder: "0.000"
        },
        {
          name: "currentStock",
          label: "Estoque atual",
          type: "number",
          step: "0.001",
          placeholder: "0.000"
        },
        { name: "expiresAt", label: "Validade", type: "date" }
      ]}
      initialValues={{
        unit: "KG",
        cost: "0",
        minimumStock: "0",
        currentStock: "0"
      }}
      items={items}
      title="Insumos"
    />
  );
}
