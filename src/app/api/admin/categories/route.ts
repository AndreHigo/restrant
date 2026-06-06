import { createCollectionHandlers } from "@/lib/api/admin";
import { categorySchema } from "@/lib/validations/master-data";
import { createCategory, listCategories } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "categories.view",
  schema: categorySchema,
  list: listCategories,
  create: createCategory
});
