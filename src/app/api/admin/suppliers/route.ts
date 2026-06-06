import { createCollectionHandlers } from "@/lib/api/admin";
import { supplierSchema } from "@/lib/validations/master-data";
import { createSupplier, listSuppliers } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "suppliers.view",
  schema: supplierSchema,
  list: listSuppliers,
  create: createSupplier
});
