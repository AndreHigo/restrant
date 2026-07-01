import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { RecipeItemForm } from "@/components/admin/recipe-item-form";
import { listRecipes } from "@/lib/services/stock";

export default async function RecipesPage() {
  await requirePagePermission("products.view");

  const [recipes, products, ingredients] = await Promise.all([
    listRecipes(),
    db.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" }
    }),
    db.ingredient.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Fichas tecnicas</h3>
          <p className="mt-1 text-sm text-slate-500">
            Consumo padrao de insumos por produto vendido.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{recipe.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {recipe.sku} - {recipe.category}
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                  {recipe.recipeCount} itens
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recipe.recipeItems.length > 0 ? (
                  recipe.recipeItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600">
                      {item.ingredientName} - {item.quantity.toLocaleString("pt-BR")} {item.ingredientUnit}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                    Produto sem ficha tecnica cadastrada.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Novo item de ficha</h3>
          <p className="mt-1 text-sm text-slate-500">
            Vincule insumos ao produto para preparar a baixa automatica por venda.
          </p>
        </div>
        <div className="mt-6">
          <RecipeItemForm
            ingredients={ingredients.map((item) => ({
              code: item.sku,
              label: item.name,
              meta: item.unit,
              value: item.id
            }))}
            products={products.map((item) => ({
              code: item.sku,
              label: item.name,
              meta: item.categoryId ? undefined : "Sem categoria",
              value: item.id
            }))}
          />
        </div>
      </section>
    </div>
  );
}
