import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/services/master-data";
import { ResourceManager } from "@/components/admin/resource-manager";

export default async function ProductsPage() {
  await requirePagePermission("products.view");
  const [items, categories] = await Promise.all([
    listProducts(),
    db.productCategory.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <ResourceManager
      accentLabel="Venda e estoque"
      columns={[
        { key: "sku", label: "SKU" },
        { key: "name", label: "Produto" },
        { key: "category", label: "Categoria" },
        { key: "type", label: "Tipo" },
        {
          key: "price",
          label: "Preco",
          format: "currency"
        },
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
      description="Cadastro de produtos prontos e pesaveis com base fiscal e controle de estoque."
      endpoint="/api/admin/products"
      fields={[
        { name: "sku", label: "SKU", placeholder: "PRO-100" },
        { name: "name", label: "Nome", placeholder: "Prato da casa" },
        {
          name: "description",
          label: "Descricao",
          type: "textarea",
          placeholder: "Descricao operacional"
        },
        {
          name: "type",
          label: "Tipo",
          type: "select",
          options: [
            { label: "Pronto", value: "READY" },
            { label: "Por quilo", value: "WEIGHABLE" },
            { label: "Insumo vinculado", value: "INGREDIENT" }
          ]
        },
        {
          name: "categoryId",
          label: "Categoria",
          type: "select",
          options: categories.map((category) => ({ label: category.name, value: category.id }))
        },
        { name: "price", label: "Preco", type: "number", step: "0.01", placeholder: "0.00" },
        { name: "cost", label: "Custo", type: "number", step: "0.01", placeholder: "0.00" },
        {
          name: "pricePerKg",
          label: "Preco por kg",
          type: "number",
          step: "0.001",
          placeholder: "0.000"
        },
        { name: "unit", label: "Unidade", placeholder: "UN ou KG" },
        { name: "fiscalNcm", label: "NCM", placeholder: "0000.00.00" },
        { name: "fiscalCfop", label: "CFOP", placeholder: "5102" },
        { name: "fiscalCest", label: "CEST", placeholder: "00.000.00" },
        { name: "active", label: "Produto ativo", type: "checkbox" },
        { name: "trackStock", label: "Controla estoque", type: "checkbox" }
      ]}
      initialValues={{
        type: "READY",
        unit: "UN",
        active: true,
        trackStock: true
      }}
      items={items}
      title="Produtos"
    />
  );
}
