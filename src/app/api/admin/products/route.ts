import { createCollectionHandlers } from "@/lib/api/admin";
import { productSchema } from "@/lib/validations/master-data";
import { createProduct, listProducts } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "products.view",
  schema: productSchema,
  list: listProducts,
  create: createProduct
});
