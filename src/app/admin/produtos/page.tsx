import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/services/master-data";
import { ProductManager } from "@/components/admin/product-manager";

type ProductsPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  await requirePagePermission("products.view");
  const [items, categories, productionSectors] = await Promise.all([
    listProducts(),
    db.productCategory.findMany({ orderBy: { name: "asc" } }),
    db.productionSector.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  ]);

  return (
    <ProductManager
      categories={categories.map((category) => ({ label: category.name, value: category.id }))}
      productionSectors={productionSectors.map((sector) => ({ label: sector.name, value: sector.id }))}
      initialQuery={searchParams?.q ?? ""}
      items={items}
    />
  );
}
