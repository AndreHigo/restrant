import { requirePagePermission } from "@/lib/auth";
import { ResourceManager } from "@/components/admin/resource-manager";
import { listCategories } from "@/lib/services/master-data";

export default async function CategoriesPage() {
  await requirePagePermission("categories.view");
  const items = await listCategories();

  return (
    <ResourceManager
      accentLabel="Cadastro base"
      columns={[
        { key: "name", label: "Categoria" },
        { key: "description", label: "Descricao" },
        { key: "productsCount", label: "Produtos" }
      ]}
      description="Organizacao das familias de produtos para operacao, estoque e compras."
      endpoint="/api/admin/categories"
      fields={[
        { name: "name", label: "Nome", placeholder: "Ex.: Sobremesas" },
        {
          name: "description",
          label: "Descricao",
          type: "textarea",
          placeholder: "Detalhes da categoria"
        }
      ]}
      items={items}
      title="Categorias"
    />
  );
}
