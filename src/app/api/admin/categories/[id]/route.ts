import { createItemHandlers } from "@/lib/api/admin";
import { updateCategory } from "@/lib/services/master-data";
import { categorySchema } from "@/lib/validations/master-data";

export const { PATCH } = createItemHandlers({
  permission: "categories.view",
  schema: categorySchema,
  update: updateCategory
});
