import { createItemHandlers } from "@/lib/api/admin";
import { updateSupplier } from "@/lib/services/master-data";
import { supplierSchema } from "@/lib/validations/master-data";

export const { PATCH } = createItemHandlers({
  permission: "suppliers.view",
  schema: supplierSchema,
  update: updateSupplier
});
