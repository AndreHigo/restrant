import { createCollectionHandlers } from "@/lib/api/admin";
import { recipeItemSchema } from "@/lib/validations/stock";
import { createRecipeItem, listRecipes } from "@/lib/services/stock";

export const { GET, POST } = createCollectionHandlers({
  permission: "products.view",
  schema: recipeItemSchema,
  list: listRecipes,
  create: createRecipeItem
});
