import { createCollectionHandlers } from "@/lib/api/admin";
import { ingredientSchema } from "@/lib/validations/master-data";
import { createIngredient, listIngredients } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "ingredients.view",
  schema: ingredientSchema,
  list: listIngredients,
  create: createIngredient
});
