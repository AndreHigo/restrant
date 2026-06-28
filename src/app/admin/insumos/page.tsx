import { requirePagePermission } from "@/lib/auth";
import { listIngredients } from "@/lib/services/master-data";
import { IngredientManager } from "@/components/admin/ingredient-manager";

type IngredientsPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function IngredientsPage({ searchParams }: IngredientsPageProps) {
  await requirePagePermission("ingredients.view");
  const items = await listIngredients();

  return <IngredientManager initialQuery={searchParams?.q ?? ""} items={items} />;
}
